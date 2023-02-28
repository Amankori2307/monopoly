import {
  actionReducer,
  boardReducer,
  cardReducer,
  diceReducer,
  modalReducer,
  playerReducer,
  siteReducer,
} from '@monopoly/lib//core';
import { configureStore } from '@reduxjs/toolkit';

const rootReducer = {
  playersData: playerReducer,
  dice: diceReducer,
  board: boardReducer,
  modalData: modalReducer,
  actionData: actionReducer,
  siteData: siteReducer,
  card: cardReducer,
};

const store = configureStore({
  reducer: rootReducer,
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
