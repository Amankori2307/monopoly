import {
  boardReducer,
  diceReducer,
  IActionState,
  IBoard,
  IDiceState,
  IModalState,
  IPlayerState,
} from '@monopoly/lib//core';
import { combineReducers } from 'redux';
import actionReducer from './action';
import card from './card';
import modalReducer from './modal';
import playerReducer from './player';
import site from './site';

export interface IState {
  board: IBoard;
  dice: IDiceState;
  playersData: IPlayerState;
  modalData: IModalState;
  actionData: IActionState;
}

export default combineReducers({
  playersData: playerReducer,
  dice: diceReducer,
  board: boardReducer,
  modalData: modalReducer,
  card,
  siteData: site,
  actionData: actionReducer,
});
