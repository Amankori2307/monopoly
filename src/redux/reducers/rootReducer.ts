import {
  boardReducer,
  diceReducer,
  IBoard,
  IDiceState,
  IPlayerState,
} from '@monopoly/lib//core';
import { combineReducers } from 'redux';
import action from './action';
import card from './card';
import modal from './modal';
import playerReducer from './player';
import site from './site';

export interface IState {
  board: IBoard;
  dice: IDiceState;
  playersData: IPlayerState;
}

export default combineReducers({
  card,
  playersData: playerReducer,
  dice: diceReducer,
  board: boardReducer,
  modalData: modal,
  siteData: site,
  actionData: action,
});
