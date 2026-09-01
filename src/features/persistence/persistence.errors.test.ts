import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import { GAME_STATE_VERSION } from '../../domain/constants/game.constants';
import { StorageWriteError } from './persistence.errors';
import { loadGame, saveGame } from './persistence';

/**
 * localStorage throws on a full quota, and in some private modes on any write.
 * Unhandled that surfaced as an uncaught error mid-turn.
 */

const createGame = () =>
  createGameState(
    {
      gameId: 'storage-test',
      name: 'Storage',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: indiaEditionTheme.id,
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(3)
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saving when the browser refuses', () => {
  it('throws a StorageWriteError rather than the browser one', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => saveGame(createGame())).toThrow(StorageWriteError);
  });

  it('says what went wrong in words a player can act on', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => saveGame(createGame())).toThrow(/full or unavailable/i);
  });

  it('keeps the original browser error as the cause', () => {
    const cause = new DOMException('QuotaExceededError');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw cause;
    });

    try {
      saveGame(createGame());
      expect.unreachable('saveGame should have thrown');
    } catch (error) {
      expect((error as StorageWriteError).cause).toBe(cause);
    }
  });
});

describe('loading a save that is behind', () => {
  // The migration used to run again on every load, because the upgraded state
  // was never written back - so a game opened but not played stayed old.
  it('writes the upgraded save back', () => {
    const game = createGame();
    saveGame(game);
    // Rewrite it as a v1 shape.
    const key = `monopoly.game.${game.id}.v1`;
    const stored = JSON.parse(localStorage.getItem(key) as string);
    stored.version = 1;
    stored.players[game.playerOrder[0]].jailFreeCards = 1;
    delete stored.useSpeedDie;
    delete stored.turn.speedDieFace;
    delete stored.turn.pendingMonopolyAdvance;
    localStorage.setItem(key, JSON.stringify(stored));

    loadGame(game.id);

    const afterLoad = JSON.parse(localStorage.getItem(key) as string);
    expect(afterLoad.version).toBe(GAME_STATE_VERSION);
    expect(afterLoad.players[game.playerOrder[0]].jailFreeCards).toHaveLength(1);
  });

  it('leaves a current save untouched', () => {
    const game = createGame();
    saveGame(game);
    const key = `monopoly.game.${game.id}.v1`;
    const before = localStorage.getItem(key);

    loadGame(game.id);

    expect(localStorage.getItem(key)).toBe(before);
  });
});
