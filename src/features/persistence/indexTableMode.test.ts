import { afterEach, describe, expect, it } from 'vitest';
import { GameStatus, TableMode } from '../../domain/types/game.enums';
import { loadGameIndex, STORAGE_INDEX_KEY } from './persistence';

afterEach(() => {
  localStorage.clear();
});

/**
 * The saved-game index gained `tableMode`, and the danger is not the field -
 * it is the word `.default()`.
 *
 * `loadGameIndex` **parses and throws**, and `bootstrapRecentGames` turns a
 * throw into `setRecentGames([])` plus a load error. So a REQUIRED key here
 * would make every index written by an older build fail validation, and every
 * saved game would vanish from the front door with its per-game save sitting
 * intact on disk beside it.
 *
 * The index is hand-built here on purpose. Projecting a state through
 * `toStoredGameIndexEntry` would always include the field, and the test would
 * pass while proving nothing - the same trap the routing suite's "the host
 * really does 404" control test exists to close.
 */
describe('an index written before table modes existed', () => {
  const oldEntry = {
    id: 'game-1',
    name: 'Sunday game',
    themeId: 'india-edition',
    playerCount: 3,
    playerNames: ['Asha', 'Ravi', 'Meera'],
    status: GameStatus.InProgress,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    turnNumber: 14,
    activePlayerId: 'player-1',
    winnerPlayerId: null,
  };

  it('still loads, rather than losing every save on the home screen', () => {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify([oldEntry]));

    const index = loadGameIndex();

    expect(index).toHaveLength(1);
    expect(index[0].name).toBe('Sunday game');
  });

  // Every game written before online play existed was a hot-seat game, and it
  // is the safe reading for the ones that were not: those could not be resumed
  // anyway, because no build before this one persisted a join code.
  it('reads as a local game', () => {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify([oldEntry]));

    expect(loadGameIndex()[0].tableMode).toBe(TableMode.HotSeat);
  });

  it('is still refused when it is genuinely malformed', () => {
    localStorage.setItem(
      STORAGE_INDEX_KEY,
      JSON.stringify([{ ...oldEntry, playerCount: 'three' }])
    );

    expect(() => loadGameIndex()).toThrow();
  });
});
