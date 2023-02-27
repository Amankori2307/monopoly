import { IActionType } from '../../../interfaces';

export const SET_ACTION: IActionType = 'SET_ACTION';

export const setAction = (active, currentAction) => {
  return {
    type: SET_ACTION,
    payload: {
      active,
      currentAction,
    },
  };
};
