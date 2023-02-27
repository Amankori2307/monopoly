import { IAction, IActionState, SET_ACTION } from 'lib/core/src/lib';

const initialState: IActionState = {
  active: false,
  currentAction: null,
};

const setActionReducer = (state: IActionState, payload: any): IActionState => {
  return {
    ...state,
    currentAction: payload.currentAction,
    active: payload.active,
  };
};

export const actionReducer = (state = initialState, action: IAction) => {
  const { type, payload } = action;
  switch (type) {
    case SET_ACTION:
      return setActionReducer(state, payload);
    default:
      return state;
  }
};
