import type { GameState, StoredGameIndexEntry } from '../../domain/types/game.interfaces';
import { gameStateSchema, storedGameIndexSchema } from './schema';

export const STORAGE_INDEX_KEY = 'monopoly.games.index.v1';
export const STORAGE_GAME_KEY_PREFIX = 'monopoly.game';

const getGameStorageKey = (gameId: string) => `${STORAGE_GAME_KEY_PREFIX}.${gameId}.v1`;

const getStorage = () => window.localStorage;

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
  const storage = getStorage();
  const currentIndex = loadGameIndex().filter((entry) => entry.id !== gameState.id);
  const nextEntry = toStoredGameIndexEntry(gameState);
  const nextIndex = [nextEntry, ...currentIndex].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );

  storage.setItem(getGameStorageKey(gameState.id), JSON.stringify(gameState));
  storage.setItem(STORAGE_INDEX_KEY, JSON.stringify(nextIndex));
};

export const loadGame = (gameId: string): GameState | null => {
  const rawValue = getStorage().getItem(getGameStorageKey(gameId));
  if (!rawValue) {
    return null;
  }

  return gameStateSchema.parse(JSON.parse(rawValue)) as GameState;
};

export const deleteSavedGame = (gameId: string) => {
  const storage = getStorage();
  storage.removeItem(getGameStorageKey(gameId));
  const nextIndex = loadGameIndex().filter((entry) => entry.id !== gameId);
  storage.setItem(STORAGE_INDEX_KEY, JSON.stringify(nextIndex));
};
