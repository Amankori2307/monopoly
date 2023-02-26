import { IDice } from '../../../interfaces';
import { Action } from '../../../types';
import { ROLL_DICE, SET_DICE_SUM } from './dice.actions';

const initialState: IDice = {
  dice1: 6,
  dice2: 6,
  diceSum: null,
  setDiceSumCalledCount: 1, // to identify if if SET_DICE_SUM was triggered
};

const rollDiceReducer = (state: IDice, payload: any): IDice => {
  payload = payload as IDice;
  return {
    ...state,
    dice1: payload.dice1,
    dice2: payload.dice2,
    setDiceSumCalledCount: state.setDiceSumCalledCount + 1,
    diceSum: payload.dice1 + payload.dice2,
  };
};

const setDiceSumReducer = (state: IDice) => {
  return {
    ...state,
    setDiceSumCalledCount: state.setDiceSumCalledCount + 1,
    diceSum: state.dice1 + state.dice2,
  };
};

export function diceReducer(state = initialState, action: Action): IDice {
  const { type, payload } = action;

  switch (type) {
    case ROLL_DICE:
      return rollDiceReducer(state, payload);
    case SET_DICE_SUM:
      return setDiceSumReducer(state);
    default:
      return state;
  }
}
