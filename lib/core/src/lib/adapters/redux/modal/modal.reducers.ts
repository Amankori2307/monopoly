import { IAction, IModalState } from 'lib/core/src/lib';
import {
  SET_PLAYER_ID_FOR_MY_CARDS_MODAL,
  SET_SHOW_MODAL,
} from './modal.actions';

const initialState: IModalState = {
  showModal: false,
  currentModal: null,
  playerIdForMyCardsModal: null,
};

const setShowModalReducer = (state: IModalState, payload: any): IModalState => {
  return {
    ...state,
    ...payload,
  };
};

const setPlayerIDForMyCardsModalReducer = (
  state: IModalState,
  payload: any
): IModalState => {
  return {
    ...state,
    playerIdForMyCardsModal: payload,
  };
};

export const modalReducer = (state = initialState, action: IAction) => {
  const { type, payload } = action;
  switch (type) {
    case SET_SHOW_MODAL:
      return setShowModalReducer(state, payload);
    case SET_PLAYER_ID_FOR_MY_CARDS_MODAL:
      return setPlayerIDForMyCardsModalReducer(state, payload);
    default:
      return state;
  }
};
