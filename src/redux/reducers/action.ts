import { IAction, IActionState } from 'lib/core/src/lib';
import { SET_ACTION } from '../actions/actionTypes';

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

const actionReducer = (state = initialState, action: IAction) => {
  const { type, payload } = action;
  switch (type) {
    case SET_ACTION:
      return setActionReducer(state, payload);
    default:
      return state;
  }
};

export default actionReducer;
