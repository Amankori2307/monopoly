import { boardReducer, diceReducer, siteReducer } from '@monopoly/lib//core';
import { combineReducers } from 'redux';
import actionReducer from './action';
import cardReducer from './card';
import modalReducer from './modal';
import playerReducer from './player';

export default combineReducers({
  playersData: playerReducer,
  dice: diceReducer,
  board: boardReducer,
  modalData: modalReducer,
  actionData: actionReducer,
  siteData: siteReducer,
  card: cardReducer,
});
