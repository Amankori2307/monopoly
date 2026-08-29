import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch } from '../../app/appStore';
import { createGameState, executeGameCommand } from '../../domain/rules/gameEngine';
import { DefaultRandomSource } from '../../domain/rules/rng';
import type {
  CreateGameInput,
  GameCommand,
  GameState,
  StoredGameIndexEntry,
} from '../../domain/types/game';
import {
  deleteSavedGame,
  loadGame,
  loadGameIndex,
  saveGame,
} from '../persistence/persistence';

interface GameSliceState {
  recentGames: StoredGameIndexEntry[];
  activeGame: GameState | null;
  loadError: string | null;
  uiHints: string[];
}

const initialState: GameSliceState = {
  recentGames: [],
  activeGame: null,
  loadError: null,
  uiHints: [],
};

const slice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setRecentGames(state, action: PayloadAction<StoredGameIndexEntry[]>) {
      state.recentGames = action.payload;
    },
    setActiveGame(state, action: PayloadAction<GameState | null>) {
      state.activeGame = action.payload;
    },
    setLoadError(state, action: PayloadAction<string | null>) {
      state.loadError = action.payload;
    },
    setUiHints(state, action: PayloadAction<string[]>) {
      state.uiHints = action.payload;
    },
  },
});

export const gameReducer = slice.reducer;
export const { setRecentGames, setActiveGame, setLoadError, setUiHints } =
  slice.actions;

export const bootstrapRecentGames = () => (dispatch: AppDispatch) => {
  try {
    dispatch(setRecentGames(loadGameIndex()));
    dispatch(setLoadError(null));
  } catch (error) {
    dispatch(setRecentGames([]));
    dispatch(
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load saved games.'
      )
    );
  }
};

export const createNewGame =
  (input: CreateGameInput) => (dispatch: AppDispatch) => {
    const nextGame = createGameState(input, new DefaultRandomSource());
    saveGame(nextGame);
    dispatch(setActiveGame(nextGame));
    dispatch(setUiHints([]));
    dispatch(bootstrapRecentGames());
    return nextGame;
  };

export const loadGameById =
  (gameId: string) => (dispatch: AppDispatch) => {
    try {
      const savedGame = loadGame(gameId);
      if (!savedGame) {
        dispatch(setActiveGame(null));
        dispatch(setLoadError(`No saved game found for id ${gameId}.`));
        return null;
      }
      dispatch(setActiveGame(savedGame));
      dispatch(setLoadError(null));
      dispatch(setUiHints([]));
      dispatch(bootstrapRecentGames());
      return savedGame;
    } catch (error) {
      dispatch(setActiveGame(null));
      dispatch(
        setLoadError(
          error instanceof Error ? error.message : 'Saved game is invalid.'
        )
      );
      return null;
    }
  };

export const runGameCommand =
  (command: Exclude<GameCommand, { type: 'createGame' }>) =>
  (dispatch: AppDispatch, getState: () => { game: GameSliceState }) => {
    const currentGame = getState().game.activeGame;
    if (!currentGame) {
      return null;
    }

    const result = executeGameCommand(
      currentGame,
      command,
      new DefaultRandomSource()
    );
    saveGame(result.nextState);
    dispatch(setActiveGame(result.nextState));
    dispatch(setUiHints(result.uiHints));
    dispatch(bootstrapRecentGames());
    return result;
  };

export const removeSavedGame =
  (gameId: string) =>
  (dispatch: AppDispatch, getState: () => { game: GameSliceState }) => {
    deleteSavedGame(gameId);
    if (getState().game.activeGame?.id === gameId) {
      dispatch(setActiveGame(null));
    }
    dispatch(bootstrapRecentGames());
  };
