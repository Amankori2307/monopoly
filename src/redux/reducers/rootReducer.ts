import {
  boardReducer,
  diceReducer,
  IBoard,
  IDiceState,
  IModalState,
  IPlayerState,
} from '@monopoly/lib//core';
import { combineReducers } from 'redux';
import action from './action';
import card from './card';
import modalReducer from './modal';
import playerReducer from './player';
import site from './site';

export interface IState {
  board: IBoard;
  dice: IDiceState;
  playersData: IPlayerState;
  modalData: IModalState;
}

export default combineReducers({
  playersData: playerReducer,
  dice: diceReducer,
  board: boardReducer,
  modalData: modalReducer,
  card,
  siteData: site,
  actionData: action,
});
