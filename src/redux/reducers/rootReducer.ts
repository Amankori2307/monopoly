import {
  actionReducer,
  boardReducer,
  cardReducer,
  diceReducer,
  modalReducer,
  playerReducer,
  siteReducer,
} from '@monopoly/lib//core';
import { combineReducers } from 'redux';

export default combineReducers({
  playersData: playerReducer,
  dice: diceReducer,
  board: boardReducer,
  modalData: modalReducer,
  actionData: actionReducer,
  siteData: siteReducer,
  card: cardReducer,
});
