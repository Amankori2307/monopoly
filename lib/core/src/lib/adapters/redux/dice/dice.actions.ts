import { IDice } from "../../../interfaces";
import { ActionType } from "../../../types";

export const ROLL_DICE: ActionType = 'ROLL_DICE';
export const SET_DICE_SUM: ActionType = 'SET_DICE_SUM';



export function rollDice(diceData: IDice){
    return {
        type: ROLL_DICE,
        payload: diceData
    }
}

export function setDiceSum(){
    return {
        type: SET_DICE_SUM,
        payload: null
    }
}