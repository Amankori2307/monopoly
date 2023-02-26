import {
  boardReducer,
  diceReducer,
  IActionState,
  IBoardState,
  IDiceState,
  IModalState,
  IPlayerState,
  ISiteState,
} from '@monopoly/lib//core';
import { combineReducers } from 'redux';
import actionReducer from './action';
import card from './card';
import modalReducer from './modal';
import playerReducer from './player';
import siteReducer from './site';

export interface IState {
  board: IBoardState;
  dice: IDiceState;
  playersData: IPlayerState;
  modalData: IModalState;
  actionData: IActionState;
  siteData: ISiteState;
}

export default combineReducers({
  playersData: playerReducer,
  dice: diceReducer,
  board: boardReducer,
  modalData: modalReducer,
  actionData: actionReducer,
  siteData: siteReducer,
  card,
});
