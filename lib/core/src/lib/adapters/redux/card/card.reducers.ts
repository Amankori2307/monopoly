import { IAction, ICardState, SET_CURRENT_CARD } from 'lib/core/src/lib';

const initialState: ICardState = {
  showModal: false,
};

const setCurrentCardReducer = (state: ICardState, payload: any): ICardState => {
  return {
    ...state,
    currentCard: payload,
  };
};

export const cardReducer = (state = initialState, action: IAction) => {
  const { type, payload } = action;
  switch (type) {
    case SET_CURRENT_CARD:
      return setCurrentCardReducer(state, payload);
    default:
      return state;
  }
};
