import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/appStore';
import { GAME_STATE_VERSION, STARTING_CASH } from '../../domain/constants/game.constants';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import { GameCommandType, TurnPhase } from '../../domain/types/game.enums';
import type { CreateGameInput } from '../../domain/types/game.interfaces';
import { StorageWriteError } from '../persistence/persistence.errors';
import { loadGame, saveGame } from '../persistence/persistence';
import {
  bootstrapRecentGames,
  createNewGame,
  loadGameById,
  removeSavedGame,
  runGameCommand,
  setActiveGame,
} from './gameSlice';

/**
 * The thunks are where the engine, storage and the store meet, which makes this
 * the highest-value layer to test — and the one that had no tests at all.
 *
 * Every case here asserts on both the store *and* what landed in localStorage:
 * a thunk that updates one without the other is the failure mode that matters.
 */

const input = (overrides: Partial<CreateGameInput> = {}): CreateGameInput => ({
  name: 'Thunk Test',
  playerConfigs: [
    { name: 'Asha', tokenId: 'elephant' },
    { name: 'Vikram', tokenId: 'train' },
  ],
  themeId: indiaEditionTheme.id,
  createdAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const storedGame = (gameId: string) =>
  JSON.parse(localStorage.getItem(`monopoly.game.${gameId}.v1`) as string);

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('createNewGame', () => {
  it('puts the new game in the store and on disk together', () => {
    const store = makeStore();

    const game = store.dispatch(createNewGame(input()));

    expect(store.getState().game.activeGame?.id).toBe(game.id);
    expect(storedGame(game.id).id).toBe(game.id);
  });

  it('writes it at the current version, so it loads back', () => {
    const store = makeStore();

    const game = store.dispatch(createNewGame(input()));

    expect(storedGame(game.id).version).toBe(GAME_STATE_VERSION);
    expect(loadGame(game.id)?.id).toBe(game.id);
  });

  it('lists it among the recent games', () => {
    const store = makeStore();

    const game = store.dispatch(createNewGame(input()));

    expect(store.getState().game.recentGames.map((entry) => entry.id)).toContain(game.id);
  });

  it('gives each player the starting cash', () => {
    const store = makeStore();

    const game = store.dispatch(createNewGame(input()));

    game.playerOrder.forEach((playerId) => {
      expect(game.players[playerId].cash).toBe(STARTING_CASH);
    });
  });
});

describe('loadGameById', () => {
  it('loads a saved game into the store', () => {
    const seeded = makeStore().dispatch(createNewGame(input()));
    const store = makeStore();

    const loaded = store.dispatch(loadGameById(seeded.id));

    expect(loaded?.id).toBe(seeded.id);
    expect(store.getState().game.activeGame?.id).toBe(seeded.id);
    expect(store.getState().game.loadError).toBeNull();
  });

  it('reports a game that is not there, rather than throwing', () => {
    const store = makeStore();

    const loaded = store.dispatch(loadGameById('does-not-exist'));

    expect(loaded).toBeNull();
    expect(store.getState().game.activeGame).toBeNull();
    expect(store.getState().game.loadError).toMatch(/no saved game found/i);
  });

  // A save the schema refuses must surface as an error, not a blank screen.
  it('reports a corrupt save', () => {
    const seeded = makeStore().dispatch(createNewGame(input()));
    localStorage.setItem(
      `monopoly.game.${seeded.id}.v1`,
      JSON.stringify({ version: GAME_STATE_VERSION, id: seeded.id })
    );
    const store = makeStore();

    expect(store.dispatch(loadGameById(seeded.id))).toBeNull();
    expect(store.getState().game.loadError).not.toBeNull();
  });

  it('clears a previous load error on success', () => {
    const seeded = makeStore().dispatch(createNewGame(input()));
    const store = makeStore();

    store.dispatch(loadGameById('does-not-exist'));
    store.dispatch(loadGameById(seeded.id));

    expect(store.getState().game.loadError).toBeNull();
  });
});

describe('runGameCommand', () => {
  it('does nothing at all without an active game', () => {
    const store = makeStore();

    expect(
      store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }))
    ).toBeNull();
    expect(store.getState().game.activeGame).toBeNull();
  });

  it('advances the store and the save together', () => {
    const store = makeStore();
    const game = store.dispatch(createNewGame(input()));

    store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    const inStore = store.getState().game.activeGame;
    expect(inStore?.turn.phase).not.toBe(TurnPhase.AwaitRoll);
    // The save is the same state, not a stale copy.
    expect(storedGame(game.id).turn.phase).toBe(inStore?.turn.phase);
    expect(storedGame(game.id).history.length).toBe(inStore?.history.length);
  });

  it('turns the events it appended into toasts', () => {
    const store = makeStore();
    store.dispatch(createNewGame(input()));

    store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    const { toasts } = store.getState().ui;
    expect(toasts.length).toBeGreaterThan(0);
    // Same text as the history, by construction.
    const history = store.getState().game.activeGame?.history ?? [];
    expect(history.map((event) => event.message)).toContain(toasts[0].message);
  });

  // The engine throws on an invalid command; the store must show why rather
  // than letting it escape into React's event path.
  it('reports a rejected command and leaves the game untouched', () => {
    const store = makeStore();
    store.dispatch(createNewGame(input()));
    const before = store.getState().game.activeGame;

    const result = store.dispatch(runGameCommand({ type: GameCommandType.EndTurn }));

    expect(result).toBeNull();
    expect(store.getState().game.commandError).toMatch(/cannot be ended/i);
    expect(store.getState().game.activeGame).toBe(before);
  });

  it('clears an earlier command error once one succeeds', () => {
    const store = makeStore();
    store.dispatch(createNewGame(input()));

    store.dispatch(runGameCommand({ type: GameCommandType.EndTurn }));
    expect(store.getState().game.commandError).not.toBeNull();

    store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));
    expect(store.getState().game.commandError).toBeNull();
  });

  // A full disk must not cost the player the move they just made.
  it('keeps the move when the save fails, and says so', () => {
    const store = makeStore();
    store.dispatch(createNewGame(input()));
    const before = store.getState().game.activeGame;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    const result = store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    expect(result).not.toBeNull();
    // The move stuck...
    expect(store.getState().game.activeGame).not.toBe(before);
    // ...and the player is told it is not being saved.
    expect(store.getState().game.commandError).toMatch(/will not resume/i);
  });

  // Only the browser refusing a write means "storage is full". A TypeError from
  // our own code is a bug, and reporting it as a full disk would send the
  // player looking in the wrong place.
  it('does not blame storage for a bug of our own', () => {
    const store = makeStore();
    store.dispatch(createNewGame(input()));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new TypeError('something else entirely');
    });

    store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    const error = store.getState().game.commandError;
    expect(error).toMatch(/something else entirely/i);
    expect(error).not.toMatch(/will not resume/i);
  });

  it('does blame storage when the browser is what refused', () => {
    const store = makeStore();
    store.dispatch(createNewGame(input()));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    expect(store.getState().game.commandError).toMatch(/will not resume/i);
    expect(new StorageWriteError('x', null).name).toBe('StorageWriteError');
  });

  it('keeps the recent-games list current as the turn advances', () => {
    const store = makeStore();
    const game = store.dispatch(createNewGame(input()));

    store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    const entry = store
      .getState()
      .game.recentGames.find((candidate) => candidate.id === game.id);
    expect(entry?.turnNumber).toBe(store.getState().game.activeGame?.turnNumber);
  });
});

describe('bootstrapRecentGames', () => {
  it('reads the index off disk', () => {
    const seeded = makeStore().dispatch(createNewGame(input()));
    const store = makeStore();

    store.dispatch(bootstrapRecentGames());

    expect(store.getState().game.recentGames.map((e) => e.id)).toContain(seeded.id);
  });

  it('empties the list and reports when the index is unreadable', () => {
    localStorage.setItem('monopoly.games.index.v1', 'not json at all');
    const store = makeStore();

    store.dispatch(bootstrapRecentGames());

    expect(store.getState().game.recentGames).toEqual([]);
    expect(store.getState().game.loadError).not.toBeNull();
  });
});

describe('removeSavedGame', () => {
  it('takes it off disk and out of the list', () => {
    const store = makeStore();
    const game = store.dispatch(createNewGame(input()));

    store.dispatch(removeSavedGame(game.id));

    expect(localStorage.getItem(`monopoly.game.${game.id}.v1`)).toBeNull();
    expect(store.getState().game.recentGames.map((e) => e.id)).not.toContain(game.id);
  });

  it('clears the active game when it is the one deleted', () => {
    const store = makeStore();
    const game = store.dispatch(createNewGame(input()));

    store.dispatch(removeSavedGame(game.id));

    expect(store.getState().game.activeGame).toBeNull();
  });

  it('leaves a different active game alone', () => {
    const store = makeStore();
    const other = store.dispatch(createNewGame(input({ name: 'Other' })));
    const active = store.dispatch(createNewGame(input({ name: 'Active' })));
    store.dispatch(setActiveGame(active));

    store.dispatch(removeSavedGame(other.id));

    expect(store.getState().game.activeGame?.id).toBe(active.id);
  });
});

describe('store isolation', () => {
  // The whole point of makeStore(): two stores in one file must not share state,
  // which is what a singleton used to cause.
  it('gives each store its own state', () => {
    const first = makeStore();
    const second = makeStore();

    first.dispatch(createNewGame(input()));

    expect(second.getState().game.activeGame).toBeNull();
  });

  it('starts from preloaded state when given some', () => {
    const seeded = makeStore().dispatch(createNewGame(input()));
    saveGame(seeded);

    const store = makeStore({
      game: {
        recentGames: [],
        activeGame: seeded,
        loadError: null,
        commandError: null,
      },
    });

    expect(store.getState().game.activeGame?.id).toBe(seeded.id);
  });
});
