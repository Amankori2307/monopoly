import { IAction, ICardState } from 'lib/core/src/lib';
import { SET_CURRENT_CARD } from '../actions/actionTypes';

const initialState: ICardState = {
  showModal: false,
};

const setCurrentCardReducer = (state: ICardState, payload: any): ICardState => {
  return {
    ...state,
    currentCard: payload,
  };
};

const cardReducer = (state = initialState, action: IAction) => {
  const { type, payload } = action;
  switch (type) {
    case SET_CURRENT_CARD:
      return setCurrentCardReducer(state, payload);
    default:
      return state;
  }
};

export default cardReducer;
