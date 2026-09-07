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
import { StorageWriteError } from '../persistence/persistence.errors';
import {
  deleteSavedGame,
  loadGame,
  loadGameIndex,
  saveGame,
} from '../persistence/persistence';
import { toToasts } from './toastFeed.utils';
import type { ThunkExtra } from '../multiplayer/sessionRegistry';
import { cueForEvents } from './soundCue.utils';
import { queueFeedback } from './uiSlice';

interface GameSliceState {
  recentGames: StoredGameIndexEntry[];
  activeGame: GameState | null;
  loadError: string | null;
  /** Last command the engine rejected. Surfaced to the player, then dismissed. */
  commandError: string | null;
  /**
   * The revision this device last agreed with, and the compare-and-set target
   * for the next publish. Always 0 for a hot-seat game, where nothing reads it.
   */
  revision: number;
}

const initialState: GameSliceState = {
  recentGames: [],
  activeGame: null,
  loadError: null,
  commandError: null,
  revision: 0,
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
    setRevision(state, action: PayloadAction<number>) {
      state.revision = action.payload;
    },
  },
});

export const gameReducer = slice.reducer;
export { initialState as gameInitialState };
export const {
  setRecentGames,
  setActiveGame,
  setLoadError,
  setCommandError,
  setRevision,
} = slice.actions;

/**
 * Takes a state from another device as the truth, replacing whatever this one
 * had.
 *
 * The local save is rewritten, which is not optional: `trySave` has already
 * written the optimistic state, so skipping this would leave a move on disk
 * that the table rejected - and a refresh would restore it.
 */
export const adoptRemoteGame =
  (update: { game: GameState; revision: number }) => (dispatch: AppDispatch) => {
    const saveFailure = trySave(update.game);
    dispatch(setActiveGame(update.game));
    dispatch(setRevision(update.revision));
    dispatch(setCommandError(saveFailure));
    dispatch(bootstrapRecentGames());
  };

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

/**
 * Saves, returning the message to show when the browser refused.
 *
 * Storage failing is not the same as a command being rejected: the move has
 * already happened, and throwing it away would cost the player their turn over
 * a full disk. Anything else is a real bug and is left to the caller's catch.
 */
const trySave = (game: GameState): string | null => {
  try {
    saveGame(game);
    return null;
  } catch (error) {
    if (error instanceof StorageWriteError) {
      logger.error('persistence', error.message, { gameId: game.id });
      return `${error.message} Play continues, but this game will not resume.`;
    }
    throw error;
  }
};

/**
 * Pushes a state that has already been applied locally, and adopts whatever
 * comes back if somebody else got there first.
 *
 * Never rejects. A publish that fails is a connection problem, not a refused
 * command, and the two must not look the same on screen.
 */
const publishInBackground = async (
  dispatch: AppDispatch,
  extra: ThunkExtra,
  game: GameState,
  command: RuntimeGameCommand,
  baseRevision: number
): Promise<void> => {
  const session = extra.session.current;
  if (!session.isOnline) {
    return;
  }

  try {
    const outcome = await session.publish({
      game,
      baseRevision,
      command,
    });

    if (outcome.status === 'conflict') {
      // Remote always wins, and the command is NOT replayed: re-applying it
      // onto a new base is how a bid of 200 lands on top of a 250 that was
      // already accepted.
      dispatch(adoptRemoteGame({ game: outcome.game, revision: outcome.revision }));
    }
  } catch (error) {
    // Swallowed on purpose; the session reports connection state separately.
    logger.error('multiplayer', 'publishing failed', { error: String(error) });
  }
};

export const runGameCommand =
  (command: RuntimeGameCommand) =>
  (
    dispatch: AppDispatch,
    getState: () => { game: GameSliceState },
    extra: ThunkExtra
  ) => {
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
      // The move has happened; a storage failure must not undo it. Apply it and
      // say it is not being saved, rather than reporting the command rejected.
      const saveFailure = trySave(result.nextState);
      dispatch(setActiveGame(result.nextState));
      // result.events is what this command appended, so the feedback and the
      // game record are the same text by construction - and the sound comes off
      // the same batch, so a cue and its toast are always the same event.
      //
      // Queued rather than shown: the engine resolves the whole turn in one
      // step, so at this instant the token has not walked anywhere yet and the
      // rent notice would beat the player to the space they are paying for.
      // `useFeedbackGate` releases the queue once the board has caught up. The
      // thunk deliberately has no say in the timing - only the screen knows
      // whether a token is still walking.
      const cue = cueForEvents(result.events);
      dispatch(
        queueFeedback({
          toasts: toToasts(result.events),
          // The event's own id, so two of the same cue in a row sound twice.
          cue: cue ? { id: result.events[0]?.id ?? cue, cue } : null,
        })
      );
      dispatch(setCommandError(saveFailure));
      dispatch(bootstrapRecentGames());

      // Fire-and-forget, and deliberately last. The engine is never awaited
      // and local persistence stays synchronous: the network is a replication
      // layer beside the command path, not inside it. For a hot-seat game this
      // is LocalSession and resolves to nothing, so there is one code path
      // rather than an `if (isOnline)` that can rot on one side.
      //
      // Nothing here may throw into the caller - this runs after the move has
      // already been applied and saved, so a network failure must not look
      // like a rejected command.
      void publishInBackground(
        dispatch,
        extra,
        result.nextState,
        command,
        getState().game.revision
      );

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
