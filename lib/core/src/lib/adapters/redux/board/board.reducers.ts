import { Board } from '../../../entities';
import { IBoardState } from '../../../interfaces';
import { Action } from '../../../types';
import { INIT_BOARD, SET_IS_DONE } from './board.actions';

type BoardStateSliceType = IBoardState;
const initialState: BoardStateSliceType = {
  side: 0,
  rowWidth: 0,
  positions: [],
  isDone: false,
};

export const boardReducer = (state = initialState, action: Action) => {
  const { type, payload } = action;
  const board = new Board();

  switch (type) {
    case SET_IS_DONE:
      return {
        ...state,
        isDone: payload,
      };
    case INIT_BOARD:
      return {
        ...state,
        ...board.init(payload),
      };
    default:
      return state;
  }
};
