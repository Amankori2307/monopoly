import { boardReducer, diceReducer, IBoard, IDice } from '@monopoly/lib//core';
import { combineReducers } from 'redux';
import action from './action';
import card from './card';
import modal from './modal';
import player from './player';
import site from './site';

export interface IState {
  board: IBoard;
  dice: IDice;
}

export default combineReducers({
  card,
  playersData: player,
  dice: diceReducer,
  board: boardReducer,
  modalData: modal,
  siteData: site,
  actionData: action,
});
