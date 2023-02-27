import { IActionType, IDiceState } from '../../../interfaces';

export const ROLL_DICE: IActionType = 'ROLL_DICE';
export const SET_DICE_SUM: IActionType = 'SET_DICE_SUM';

export function rollDice(diceData: IDiceState) {
  return {
    type: ROLL_DICE,
    payload: diceData,
  };
}

export function setDiceSum() {
  return {
    type: SET_DICE_SUM,
    payload: null,
  };
}
