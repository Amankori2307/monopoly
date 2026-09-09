import type { GameState, StoredGameIndexEntry } from '../../domain/types/game.interfaces';
import { decodeGameState } from './decodeGameState';
import { StorageWriteError } from './persistence.errors';
import { storedGameIndexSchema } from './schema';

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
  // Projected onto the index so the home screen can tell a local save from an
  // online one without parsing a full state - which is the index's whole job.
  tableMode: gameState.tableMode,
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

  // Decoding - migrate, then validate - is shared with the network path, so a
  // state that arrives from another device is treated exactly as one off disk.
  const { game, wasBehind } = decodeGameState(JSON.parse(rawValue), 'this device');

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
