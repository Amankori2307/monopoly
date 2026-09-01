import type { GameState, StoredGameIndexEntry } from '../../domain/types/game.interfaces';
import { migrateSavedGame, needsMigration } from './migrations';
import { StorageWriteError } from './persistence.errors';
import { gameStateSchema, storedGameIndexSchema } from './schema';

export const STORAGE_INDEX_KEY = 'monopoly.games.index.v1';
export const STORAGE_GAME_KEY_PREFIX = 'monopoly.game';

const getGameStorageKey = (gameId: string) => `${STORAGE_GAME_KEY_PREFIX}.${gameId}.v1`;

const getStorage = () => window.localStorage;

/**
 * Writes to storage, turning the browser's failures into something callers can
 * act on.
 *
 * localStorage throws on a full quota and, in some private modes, on any write
 * at all. Unhandled that surfaced as an uncaught error mid-turn, losing the
 * move that triggered it rather than the save.
 */
const writeToStorage = (key: string, value: string) => {
  try {
    getStorage().setItem(key, value);
  } catch (error) {
    // Only the browser refusing the write. A TypeError from our own
    // serialisation is a bug, and telling the player their disk is full would
    // send them looking in the wrong place - so it goes up as itself.
    if (error instanceof DOMException) {
      throw new StorageWriteError(
        'The game could not be saved. Browser storage is full or unavailable.',
        error
      );
    }
    throw error;
  }
};

export const toStoredGameIndexEntry = (gameState: GameState): StoredGameIndexEntry => ({
  id: gameState.id,
  name: gameState.name,
  themeId: gameState.themeId,
  playerCount: gameState.playerOrder.length,
  playerNames: gameState.playerOrder.map((playerId) => gameState.players[playerId].name),
  status: gameState.status,
  createdAt: gameState.createdAt,
  updatedAt: gameState.updatedAt,
  turnNumber: gameState.turnNumber,
  activePlayerId: gameState.playerOrder[gameState.activePlayerIndex],
  winnerPlayerId: gameState.winnerPlayerId,
});

export const loadGameIndex = (): StoredGameIndexEntry[] => {
  const rawValue = getStorage().getItem(STORAGE_INDEX_KEY);
  if (!rawValue) {
    return [];
  }

  return storedGameIndexSchema.parse(JSON.parse(rawValue)) as StoredGameIndexEntry[];
};

export const saveGame = (gameState: GameState) => {
  const currentIndex = loadGameIndex().filter((entry) => entry.id !== gameState.id);
  const nextEntry = toStoredGameIndexEntry(gameState);
  const nextIndex = [nextEntry, ...currentIndex].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );

  writeToStorage(getGameStorageKey(gameState.id), JSON.stringify(gameState));
  writeToStorage(STORAGE_INDEX_KEY, JSON.stringify(nextIndex));
};

export const loadGame = (gameId: string): GameState | null => {
  const rawValue = getStorage().getItem(getGameStorageKey(gameId));
  if (!rawValue) {
    return null;
  }

  const stored = JSON.parse(rawValue);
  // Migrate before validating: the schema describes the current shape, so an
  // older save has to be brought up to it or it fails to parse and is lost.
  const wasBehind = needsMigration(stored);
  const game = gameStateSchema.parse(migrateSavedGame(stored)) as GameState;

  // Write the upgraded save back. Without this the migration ran again on every
  // load, and a game opened but not played stayed on the old shape on disk -
  // so the next release's migration would have to cope with a version that
  // should already have been retired.
  if (wasBehind) {
    writeToStorage(getGameStorageKey(gameId), JSON.stringify(game));
  }

  return game;
};

export const deleteSavedGame = (gameId: string) => {
  const storage = getStorage();
  storage.removeItem(getGameStorageKey(gameId));
  const nextIndex = loadGameIndex().filter((entry) => entry.id !== gameId);
  writeToStorage(STORAGE_INDEX_KEY, JSON.stringify(nextIndex));
};
