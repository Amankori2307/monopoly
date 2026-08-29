import { configureStore } from '@reduxjs/toolkit';
import { gameReducer } from '../features/game/gameSlice';
import { uiReducer } from '../features/game/uiSlice';

export const appStore = configureStore({
  reducer: {
    game: gameReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;
