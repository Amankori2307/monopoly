import { IActionType } from '../../../interfaces';

export const SET_IS_DONE: IActionType = 'SET_IS_DONE';
export const INIT_BOARD: IActionType = 'INIT_BOARD';

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
