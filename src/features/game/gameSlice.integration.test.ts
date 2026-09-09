import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/appStore';
import type { GameSession } from '../multiplayer/gameSession.interfaces';
import { setConnection } from '../multiplayer/seatSlice';
import { ConnectionState } from '../multiplayer/viewer.enums';
import {
  AUCTION_START_PRICE,
  GAME_STATE_VERSION,
  STARTING_CASH,
} from '../../domain/constants/game.constants';
import { indiaTheme as indiaEditionTheme } from '../../domain/themes/india.theme';
import {
  GameCommandType,
  GameEventCue,
  PendingDecisionType,
  SpaceKind,
  TurnPhase,
} from '../../domain/types/game.enums';
import type { CreateGameInput } from '../../domain/types/game.interfaces';
import { StorageWriteError } from '../persistence/persistence.errors';
import { loadGame, saveGame } from '../persistence/persistence';
import { SOUND_PREFERENCE_KEY } from './soundPreference.utils';
import { releaseFeedback, setSoundEnabled } from './uiSlice';
import {
  adoptRemoteGame,
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

    const { toasts } = store.getState().ui.pendingFeedback;
    expect(toasts.length).toBeGreaterThan(0);
    // Same text as the history, by construction.
    const history = store.getState().game.activeGame?.history ?? [];
    expect(history.map((event) => event.message)).toContain(toasts[0].message);
  });

  /**
   * The thunk queues; it does not show.
   *
   * A roll resolves the whole turn in one synchronous step, so at the instant
   * it returns the token has not walked anywhere - putting "paid ₹250 rent" on
   * screen here announced the outcome before the move that caused it. Only the
   * screen knows whether a token is still walking, so only the screen decides
   * when the queue drains (`useFeedbackGate`).
   */
  it('shows none of it yet, because the token has not moved on screen', () => {
    const store = makeStore();
    store.dispatch(createNewGame(input()));

    store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    expect(store.getState().ui.pendingFeedback.toasts.length).toBeGreaterThan(0);
    expect(store.getState().ui.toasts).toEqual([]);
    expect(store.getState().ui.soundCue).toBeNull();
  });

  // What the gate does when the walk settles, without a screen to run it.
  it('puts the queue on screen when the board has caught up', () => {
    const store = makeStore();
    store.dispatch(createNewGame(input()));

    store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));
    store.dispatch(releaseFeedback());

    const { toasts, pendingFeedback } = store.getState().ui;
    expect(toasts.length).toBeGreaterThan(0);
    expect(pendingFeedback).toEqual({ toasts: [], cue: null });
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

  /**
   * The engine's refusal and the button's refusal are one string.
   *
   * They were two: the command threw "Player does not have enough money to buy
   * this asset." while the button had no opinion at all and stayed live.
   */
  it('refuses an unaffordable purchase in the same words the button uses', () => {
    const store = makeStore();
    const game = store.dispatch(createNewGame(input()));
    const street = game.board.find((space) => space.kind === SpaceKind.Street);
    const buyer = game.playerOrder[game.activePlayerIndex];
    store.dispatch(
      setActiveGame({
        ...game,
        players: {
          ...game.players,
          [buyer]: { ...game.players[buyer], cash: 0, position: street!.index },
        },
        pendingDecision: {
          type: PendingDecisionType.LandedUnownedProperty,
          spaceId: street!.id,
          playerId: buyer,
        },
        turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
      })
    );

    store.dispatch(runGameCommand({ type: GameCommandType.BuyLandedAsset }));

    expect(store.getState().game.commandError).toMatch(/not enough cash/i);
    // The decision is untouched, so the player can still send it to auction.
    expect(store.getState().game.activeGame?.pendingDecision.type).toBe(
      PendingDecisionType.LandedUnownedProperty
    );
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

/**
 * The auction's ledger, through the store and onto disk.
 *
 * It is game state, so a bid that reaches the store without reaching
 * localStorage would come back missing on resume - the same failure mode every
 * other case here checks for, on the newest piece of state.
 */
describe('an auction through the store', () => {
  /**
   * Declines a landed site, which is what opens an auction.
   *
   * Three players, not the file's usual two: with two, the first pass leaves a
   * single bidder and settles the auction immediately, so there is nothing left
   * to assert a ledger on.
   */
  const openAuction = (store: ReturnType<typeof makeStore>) => {
    const game = store.dispatch(
      createNewGame(
        input({
          playerConfigs: [
            { name: 'Asha', tokenId: 'elephant' },
            { name: 'Vikram', tokenId: 'train' },
            { name: 'Meera', tokenId: 'auto' },
          ],
        })
      )
    );
    const street = game.board.find((space) => space.kind === SpaceKind.Street);
    if (!street) {
      throw new Error('No street on the board');
    }
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    store.dispatch(
      setActiveGame({
        ...game,
        players: {
          ...game.players,
          [activePlayerId]: { ...game.players[activePlayerId], position: street.index },
        },
        pendingDecision: {
          type: PendingDecisionType.LandedUnownedProperty,
          spaceId: street.id,
          playerId: activePlayerId,
        },
        turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
      })
    );
    store.dispatch(runGameCommand({ type: GameCommandType.DeclineLandedAsset }));

    return game.id;
  };

  it('opens the ledger on the start price, in the store and on disk', () => {
    const store = makeStore();

    const gameId = openAuction(store);

    const opening = { kind: 'start', playerId: null, amount: AUCTION_START_PRICE };
    expect(store.getState().game.activeGame?.auctionState?.ledger).toEqual([opening]);
    expect(storedGame(gameId).auctionState.ledger).toEqual([opening]);
  });

  it('carries a bid onto disk, against the player who made it', () => {
    const store = makeStore();
    const gameId = openAuction(store);
    const bidderId =
      store.getState().game.activeGame?.auctionState?.activeBidderOrder[
        store.getState().game.activeGame?.auctionState?.activeBidderIndex ?? 0
      ];

    store.dispatch(
      runGameCommand({ type: GameCommandType.SubmitAuctionBid, amount: 60 })
    );

    expect(storedGame(gameId).auctionState.ledger.at(-1)).toEqual({
      kind: 'bid',
      playerId: bidderId,
      amount: 60,
    });
  });

  it('carries a pass onto disk, with no amount', () => {
    const store = makeStore();
    const gameId = openAuction(store);

    store.dispatch(runGameCommand({ type: GameCommandType.PassAuction }));

    expect(storedGame(gameId).auctionState.ledger.at(-1)).toMatchObject({
      kind: 'pass',
      amount: null,
    });
  });

  // The whole run, in order - what the panel reads back.
  it('accumulates the bidding in order', () => {
    const store = makeStore();
    const gameId = openAuction(store);

    store.dispatch(
      runGameCommand({ type: GameCommandType.SubmitAuctionBid, amount: 20 })
    );
    store.dispatch(
      runGameCommand({ type: GameCommandType.SubmitAuctionBid, amount: 50 })
    );

    expect(
      storedGame(gameId).auctionState.ledger.map(
        (entry: { kind: string; amount: number | null }) => [entry.kind, entry.amount]
      )
    ).toEqual([
      ['start', AUCTION_START_PRICE],
      ['bid', 20],
      ['bid', 50],
    ]);
  });

  // A save written mid-auction has to come back through zod with its ledger.
  it('reloads a game caught mid-auction with its bidding intact', () => {
    const store = makeStore();
    const gameId = openAuction(store);
    store.dispatch(
      runGameCommand({ type: GameCommandType.SubmitAuctionBid, amount: 35 })
    );

    expect(loadGame(gameId)?.auctionState?.ledger.at(-1)).toMatchObject({
      kind: 'bid',
      amount: 35,
    });
  });

  // A rejected bid must leave no trace: the panel guards against this, but the
  // store is where a dispatch that slipped past it would land.
  it('records nothing for a bid the engine refuses', () => {
    const store = makeStore();
    const gameId = openAuction(store);

    store.dispatch(runGameCommand({ type: GameCommandType.SubmitAuctionBid, amount: 1 }));

    expect(storedGame(gameId).auctionState.ledger).toHaveLength(1);
    expect(store.getState().game.commandError).toMatch(/at least/i);
  });
});

/**
 * The sound cue, through the store.
 *
 * It is picked from the same `result.events` the toasts come from, so a cue and
 * its toast are always the same event - the property the toast feed already has
 * with the game record.
 */
describe('the sound cue a command leaves behind', () => {
  const landOnUnowned = (store: ReturnType<typeof makeStore>) => {
    const game = store.dispatch(createNewGame(input()));
    const street = game.board.find((space) => space.kind === SpaceKind.Street);
    if (!street) {
      throw new Error('No street on the board');
    }
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    store.dispatch(
      setActiveGame({
        ...game,
        players: {
          ...game.players,
          [activePlayerId]: { ...game.players[activePlayerId], position: street.index },
        },
        pendingDecision: {
          type: PendingDecisionType.LandedUnownedProperty,
          spaceId: street.id,
          playerId: activePlayerId,
        },
        turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
      })
    );
    return street.id as string;
  };

  it('says a site was bought', () => {
    const store = makeStore();
    landOnUnowned(store);

    store.dispatch(runGameCommand({ type: GameCommandType.BuyLandedAsset }));
    store.dispatch(releaseFeedback());

    expect(store.getState().ui.soundCue?.cue).toBe(GameEventCue.Bought);
  });

  // Held with its toast, not ahead of it: the sound must not announce a space
  // the token is still walking towards.
  it('waits in the queue rather than sounding straight away', () => {
    const store = makeStore();
    landOnUnowned(store);

    store.dispatch(runGameCommand({ type: GameCommandType.BuyLandedAsset }));

    expect(store.getState().ui.soundCue).toBeNull();
    expect(store.getState().ui.pendingFeedback.cue?.cue).toBe(GameEventCue.Bought);
  });

  it('leaves the cue alone on a command that logs nothing worth hearing', () => {
    const store = makeStore();
    const game = store.dispatch(createNewGame(input()));
    store.dispatch(
      setActiveGame({ ...game, turn: { ...game.turn, phase: TurnPhase.TurnComplete } })
    );

    store.dispatch(runGameCommand({ type: GameCommandType.EndTurn }));
    store.dispatch(releaseFeedback());

    expect(store.getState().ui.soundCue).toBeNull();
  });

  // The cue rides the same batch as the toasts, so they cannot disagree.
  it('pushes a toast for the same command that set the cue', () => {
    const store = makeStore();
    landOnUnowned(store);

    store.dispatch(runGameCommand({ type: GameCommandType.BuyLandedAsset }));
    store.dispatch(releaseFeedback());

    expect(store.getState().ui.toasts.length).toBeGreaterThan(0);
    expect(store.getState().ui.soundCue).not.toBeNull();
  });

  // A preference, not game state: it stays out of the save and outlives a game.
  it('remembers the mute across a store, without touching the save', () => {
    const store = makeStore();
    const game = store.dispatch(createNewGame(input()));

    store.dispatch(setSoundEnabled(false));

    expect(localStorage.getItem(SOUND_PREFERENCE_KEY)).toBe('off');
    expect(storedGame(game.id)).not.toHaveProperty('soundEnabled');
    // A fresh store reads it back.
    expect(makeStore().getState().ui.soundEnabled).toBe(false);
  });

  // The mute has to reach the queue, not just the sound slot: a cue waiting on
  // a walk would otherwise fire the moment the token arrived, after the player
  // had already switched the sound off.
  it('clears a queued cue when sound is switched off', () => {
    const store = makeStore();
    landOnUnowned(store);
    store.dispatch(runGameCommand({ type: GameCommandType.BuyLandedAsset }));

    store.dispatch(setSoundEnabled(false));

    expect(store.getState().ui.pendingFeedback.cue).toBeNull();
    store.dispatch(releaseFeedback());
    expect(store.getState().ui.soundCue).toBeNull();
    // The toast still arrives - muting silences the game, it does not hide it.
    expect(store.getState().ui.toasts.length).toBeGreaterThan(0);
  });
});

/**
 * A collect-from-each card bills every player, so a player whose turn it is
 * not can be left owing money they cannot pay. Mortgaging is the documented
 * way out of that, and it used to act on the active player - so the debtor was
 * told they did not own their own site. This asserts the whole path: thunk,
 * engine, store and the saved copy.
 */
describe('a non-active debtor raising cash', () => {
  it('mortgages their own site and the save agrees', async () => {
    const store = makeStore();
    await store.dispatch(createNewGame(input()));

    const created = store.getState().game.activeGame as NonNullable<
      ReturnType<typeof store.getState>['game']['activeGame']
    >;
    const activeId = created.playerOrder[created.activePlayerIndex];
    const debtorId = created.playerOrder.find((id) => id !== activeId) as string;
    const site = created.board.find(
      (space) => space.kind === SpaceKind.Street
    ) as (typeof created.board)[number] & { mortgageValue: number };

    store.dispatch(
      setActiveGame({
        ...created,
        ownership: {
          ...created.ownership,
          [site.id]: {
            ...created.ownership[site.id],
            ownerPlayerId: debtorId,
          },
        },
        pendingDecision: {
          type: PendingDecisionType.AssetLiquidation,
          playerId: debtorId,
          amountDue: 100,
          creditorPlayerId: activeId,
          reason: 'a card they could not pay',
          queued: [],
        },
        turn: { ...created.turn, phase: TurnPhase.AwaitDecision },
      })
    );

    const cashBefore = store.getState().game.activeGame!.players[debtorId].cash;

    await store.dispatch(
      runGameCommand({ type: GameCommandType.MortgageAsset, spaceId: site.id })
    );

    const after = store.getState().game.activeGame!;
    expect(after.ownership[site.id].mortgaged).toBe(true);
    expect(after.players[debtorId].cash).toBe(cashBefore + site.mortgageValue);
    // The active player is untouched - the command acted on the debtor.
    expect(after.players[activeId].cash).toBe(created.players[activeId].cash);
    expect(storedGame(created.id).ownership[site.id].mortgaged).toBe(true);
  });
});

/**
 * The seam between the game and wherever its state lives.
 *
 * The constraint that shapes all of it: `runGameCommand` stays synchronous and
 * the local save stays synchronous. Publishing happens beside the command path,
 * never inside it - so a slow or broken network can never delay or fail a move
 * that has already been made.
 */
describe('publishing a move', () => {
  const onlineSession = (publish: GameSession['publish']): GameSession => ({
    isOnline: true,
    gameId: 'game-1',
    publish,
    fetch: vi.fn().mockResolvedValue(null),
    announce: vi.fn().mockResolvedValue(undefined),
    onHere: vi.fn().mockReturnValue(() => undefined),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    close: vi.fn(),
  });

  /** Reaches the registry the store handed its thunks. */
  /**
   * Swaps in a session AND reports the table reachable.
   *
   * Both, because a command is refused outright while the connection is not
   * live - see offlineBlockedReason. That is the "pause, do not fork" rule, and
   * `attachOnlineSession` sets the same flag in the app.
   */
  const goOnline = (store: ReturnType<typeof makeStore>, session: GameSession) => {
    registryOf(store).replace(session);
    store.dispatch(setConnection(ConnectionState.Live));
  };

  const registryOf = (store: ReturnType<typeof makeStore>) =>
    (store.dispatch as unknown as (t: unknown) => unknown)(
      (
        _d: unknown,
        _g: unknown,
        extra: { session: { replace: (s: GameSession) => void } }
      ) => extra.session
    ) as { replace: (s: GameSession) => void };

  const startedGame = async (store: ReturnType<typeof makeStore>) => {
    await store.dispatch(createNewGame(input()));
    return store.getState().game.activeGame!;
  };

  it('does not publish anything for a hot-seat game', async () => {
    const store = makeStore();
    await startedGame(store);
    const publish = vi.fn();
    // The default session is local; swapping in a spy that claims to be
    // offline proves the isOnline gate, not the session type.
    goOnline(store, { ...onlineSession(publish), isOnline: false });

    await store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    expect(publish).not.toHaveBeenCalled();
  });

  it('publishes after the move is applied, at the revision it was based on', async () => {
    const store = makeStore();
    const game = await startedGame(store);
    const publish = vi.fn().mockResolvedValue({ status: 'accepted', revision: 1 });
    goOnline(store, onlineSession(publish));

    await store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    expect(publish).toHaveBeenCalledTimes(1);
    const [call] = publish.mock.calls;
    expect(call[0].baseRevision).toBe(0);
    // What is published is the state AFTER the command, not before it.
    expect(call[0].game.turnNumber).toBeGreaterThanOrEqual(game.turnNumber);
    expect(call[0].command).toEqual({ type: GameCommandType.RollTurnDice });
  });

  it('applies the move locally even when publishing throws', async () => {
    const store = makeStore();
    await startedGame(store);
    goOnline(store, onlineSession(vi.fn().mockRejectedValue(new Error('offline'))));

    const before = store.getState().game.activeGame!.turn.phase;
    await store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));
    await Promise.resolve();

    // A network failure is a connection problem, not a refused command, and
    // the two must not look the same on screen.
    expect(store.getState().game.activeGame!.turn.phase).not.toBe(before);
    expect(store.getState().game.commandError).toBeNull();
  });

  it('adopts the remote state on a conflict, and does not replay the command', async () => {
    const store = makeStore();
    const game = await startedGame(store);
    const theirs = { ...game, turnNumber: 99 };
    const publish = vi
      .fn()
      .mockResolvedValue({ status: 'conflict', revision: 7, game: theirs });
    goOnline(store, onlineSession(publish));

    await store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));
    await vi.waitFor(() => expect(store.getState().game.revision).toBe(7));

    // Remote wins outright. Re-applying the command onto the new base is how a
    // bid of 200 lands on top of a 250 that was already accepted.
    expect(store.getState().game.activeGame!.turnNumber).toBe(99);
    expect(publish).toHaveBeenCalledTimes(1);
    // And the adopted state reaches disk - trySave already wrote the
    // optimistic one, so a refresh would otherwise restore a phantom move.
    expect(storedGame(game.id).turnNumber).toBe(99);
  });
});

/**
 * A remote player has to be told what happened. Toasts and the cue are built
 * from `result.events`, which only the device that ran the command has - so
 * without a diff the board changes in silence.
 */
describe('adopting a state from another device', () => {
  it('announces only what happened since this device last spoke', async () => {
    const store = makeStore();
    await store.dispatch(createNewGame(input()));
    const created = store.getState().game.activeGame!;

    // Two new events on top of whatever creation logged.
    const theirs = {
      ...created,
      history: [
        {
          id: 'event-new-2',
          turnNumber: 1,
          createdAt: '2026-09-01T00:00:00.000Z',
          message: 'Vikram paid rent',
          cue: GameEventCue.Rent,
        },
        {
          id: 'event-new-1',
          turnNumber: 1,
          createdAt: '2026-09-01T00:00:00.000Z',
          message: 'Vikram rolled',
          cue: GameEventCue.None,
        },
        ...created.history,
      ],
    };

    await store.dispatch(adoptRemoteGame({ game: theirs, revision: 4 }));

    const queued = store.getState().ui.pendingFeedback.toasts;
    expect(queued.map((toast) => toast.message)).toEqual([
      'Vikram rolled',
      'Vikram paid rent',
    ]);
    // Queued, not shown: it still waits for the token to finish walking.
    expect(store.getState().ui.pendingFeedback.cue).not.toBeNull();
  });

  it('says nothing when it has already spoken about everything', async () => {
    const store = makeStore();
    await store.dispatch(createNewGame(input()));
    const created = store.getState().game.activeGame!;

    await store.dispatch(adoptRemoteGame({ game: created, revision: 2 }));
    store.dispatch(releaseFeedback());

    await store.dispatch(adoptRemoteGame({ game: created, revision: 3 }));

    expect(store.getState().ui.pendingFeedback.toasts).toEqual([]);
  });

  it('does not replay a game it is seeing for the first time', async () => {
    // Joining a game in progress must not fire a toast per event of a history
    // that happened before you arrived.
    const store = makeStore();
    await store.dispatch(createNewGame(input()));
    const created = store.getState().game.activeGame!;
    const fresh = makeStore();

    await fresh.dispatch(adoptRemoteGame({ game: created, revision: 9 }));

    expect(fresh.getState().ui.pendingFeedback.toasts).toEqual([]);
  });
});

/**
 * The rule that keeps a shared game shareable: a device that cannot reach the
 * table stops making moves rather than building a private game on the side.
 */
describe('a table this device cannot reach', () => {
  const unreachable = (): GameSession => ({
    isOnline: true,
    gameId: 'game-1',
    publish: vi.fn().mockResolvedValue({ status: 'failed', message: 'offline' }),
    fetch: vi.fn().mockResolvedValue(null),
    announce: vi.fn().mockResolvedValue(undefined),
    onHere: vi.fn().mockReturnValue(() => undefined),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    close: vi.fn(),
  });

  it('refuses the move rather than making it locally', async () => {
    const store = makeStore();
    await store.dispatch(createNewGame(input()));
    const before = store.getState().game.activeGame!;
    (store.dispatch as unknown as (t: unknown) => unknown)(
      (
        _d: unknown,
        _g: unknown,
        extra: { session: { replace: (s: GameSession) => void } }
      ) => extra.session.replace(unreachable())
    );
    store.dispatch(setConnection(ConnectionState.Offline));

    await store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));

    // Nothing moved, and the player is told why - a silent stall is the failure
    // this whole app already has a banner for.
    expect(store.getState().game.activeGame!.turn.phase).toBe(before.turn.phase);
    expect(store.getState().game.commandError).toMatch(/reachable/i);
  });

  it('marks the connection degraded when a publish does not land', async () => {
    const store = makeStore();
    await store.dispatch(createNewGame(input()));
    (store.dispatch as unknown as (t: unknown) => unknown)(
      (
        _d: unknown,
        _g: unknown,
        extra: { session: { replace: (s: GameSession) => void } }
      ) => extra.session.replace(unreachable())
    );
    store.dispatch(setConnection(ConnectionState.Live));

    await store.dispatch(runGameCommand({ type: GameCommandType.RollTurnDice }));
    await vi.waitFor(() =>
      expect(store.getState().seat.connection).toBe(ConnectionState.Degraded)
    );

    // The move itself stands: it was applied and saved before the publish was
    // even attempted, and undoing it would be worse than reporting the split.
    expect(store.getState().game.activeGame!.turn.phase).not.toBe('await_roll');
  });
});
