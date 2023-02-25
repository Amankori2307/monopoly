import { ActionType } from '../../../types';

export const SET_IS_DONE: ActionType = 'SET_IS_DONE';
export const INIT_BOARD: ActionType = 'INIT_BOARD';

export const setIsDone = (isDone: boolean) => {
  return {
    type: SET_IS_DONE,
    payload: isDone,
  };
};

export const initBoard = (side: number) => {
  return {
    type: INIT_BOARD,
    payload: side,
  };
};
