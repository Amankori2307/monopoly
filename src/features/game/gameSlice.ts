import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch } from '../../app/appStore';
import { createGameState, executeGameCommand } from '../../domain/rules/gameEngine';
import { DefaultRandomSource } from '../../domain/rules/rng';
import type {
  CreateGameInput,
  GameState,
  RuntimeGameCommand,
  StoredGameIndexEntry,
} from '../../domain/types/game.interfaces';
import { describeError, logger } from '../../shared/utils/logger.utils';
import {
  deleteSavedGame,
  loadGame,
  loadGameIndex,
  saveGame,
} from '../persistence/persistence';
import { selectNewEvents, toToasts } from './toastFeed.utils';
import { pushToasts } from './uiSlice';

interface GameSliceState {
  recentGames: StoredGameIndexEntry[];
  activeGame: GameState | null;
  loadError: string | null;
  /** Last command the engine rejected. Surfaced to the player, then dismissed. */
  commandError: string | null;
}

const initialState: GameSliceState = {
  recentGames: [],
  activeGame: null,
  loadError: null,
  commandError: null,
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
    setCommandError(state, action: PayloadAction<string | null>) {
      state.commandError = action.payload;
    },
  },
});

export const gameReducer = slice.reducer;
export const { setRecentGames, setActiveGame, setLoadError, setCommandError } =
  slice.actions;

export const bootstrapRecentGames = () => (dispatch: AppDispatch) => {
  try {
    dispatch(setRecentGames(loadGameIndex()));
    dispatch(setLoadError(null));
  } catch (error) {
    dispatch(setRecentGames([]));
    dispatch(
      setLoadError(error instanceof Error ? error.message : 'Failed to load saved games.')
    );
  }
};

export const createNewGame = (input: CreateGameInput) => (dispatch: AppDispatch) => {
  const nextGame = createGameState(input, new DefaultRandomSource());
  saveGame(nextGame);
  dispatch(setActiveGame(nextGame));
  dispatch(bootstrapRecentGames());
  return nextGame;
};

export const loadGameById = (gameId: string) => (dispatch: AppDispatch) => {
  try {
    const savedGame = loadGame(gameId);
    if (!savedGame) {
      dispatch(setActiveGame(null));
      dispatch(setLoadError(`No saved game found for id ${gameId}.`));
      return null;
    }
    dispatch(setActiveGame(savedGame));
    dispatch(setLoadError(null));
    dispatch(bootstrapRecentGames());
    return savedGame;
  } catch (error) {
    dispatch(setActiveGame(null));
    dispatch(
      setLoadError(error instanceof Error ? error.message : 'Saved game is invalid.')
    );
    return null;
  }
};

export const runGameCommand =
  (command: RuntimeGameCommand) =>
  (dispatch: AppDispatch, getState: () => { game: GameSliceState }) => {
    const currentGame = getState().game.activeGame;
    if (!currentGame) {
      return null;
    }

    // The engine throws on an invalid command. Catching here keeps the failure
    // out of React's render/event path: an uncaught throw used to abort the
    // caller mid-flight (it left the dice stuck on "Rolling..."), and left no
    // trace of what went wrong.
    try {
      logger.debug('gameCommand', `dispatching ${command.type}`, {
        gameId: currentGame.id,
        turnNumber: currentGame.turnNumber,
        phase: currentGame.turn.phase,
        pendingDecision: currentGame.pendingDecision.type,
      });

      const result = executeGameCommand(currentGame, command, new DefaultRandomSource());
      saveGame(result.nextState);
      dispatch(setActiveGame(result.nextState));
      // Feedback comes from the history delta, not result.events - the engine
      // returns the whole capped history there, so it cannot say what changed.
      dispatch(
        pushToasts(
          toToasts(selectNewEvents(currentGame.history, result.nextState.history))
        )
      );
      dispatch(setCommandError(null));
      dispatch(bootstrapRecentGames());
      return result;
    } catch (error) {
      const { message, stack } = describeError(error);
      logger.error('gameCommand', `${command.type} rejected: ${message}`, {
        command,
        gameId: currentGame.id,
        turnNumber: currentGame.turnNumber,
        phase: currentGame.turn.phase,
        pendingDecision: currentGame.pendingDecision.type,
        activePlayerId: currentGame.playerOrder[currentGame.activePlayerIndex],
        stack,
      });
      dispatch(setCommandError(message));
      return null;
    }
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
