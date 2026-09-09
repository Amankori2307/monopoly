import { configureStore } from '@reduxjs/toolkit';
import { gameReducer } from '../features/game/gameSlice';
import { readSoundPreference } from '../features/game/soundPreference.utils';
import { readAppearancePreference } from '../features/appearance/appearancePreference.utils';
import { uiInitialState, uiReducer } from '../features/game/uiSlice';
import { seatReducer } from '../features/multiplayer/seatSlice';
import {
  createSessionRegistry,
  type ThunkExtra,
} from '../features/multiplayer/sessionRegistry';

const reducer = {
  game: gameReducer,
  ui: uiReducer,
  seat: seatReducer,
};

/** Whatever configureStore itself accepts, so callers may pass a partial tree. */
type PreloadedState = Parameters<typeof configureStore>[0]['preloadedState'];

/**
 * Builds a store.
 *
 * The app uses the single `appStore` below; tests build their own so state
 * cannot leak between renders. `preloadedState` lets a test start from a given
 * slice of state rather than dispatching its way there.
 */
export const makeStore = (preloadedState?: PreloadedState) => {
  // One registry per store, so two tests in one file cannot share a session.
  // It reaches thunks as `extraArgument`: state would trip serializableCheck
  // (a session holds a socket), and middleware is the wrong seam because every
  // mutation is dispatched as a thunk.
  const extra: ThunkExtra = { session: createSessionRegistry() };

  return configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } }),
    // The sound preference is read here rather than in the slice's initial
    // state: that is evaluated once when the module loads, so a store built
    // afterwards never saw a change. An explicit preloadedState wins over this.
    preloadedState: {
      ui: {
        ...uiInitialState,
        soundEnabled: readSoundPreference(),
        appearance: readAppearancePreference(),
      },
      ...(preloadedState as object),
    } as PreloadedState,
  });
};

export const appStore = makeStore();

type AppStore = ReturnType<typeof makeStore>;

/**
 * Derived from the factory, not hand-written. AppDispatch has to carry the thunk
 * middleware's overloads or code that reads a thunk's return value stops
 * typechecking - see createNewGame's use in NewGamePage.
 */
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
