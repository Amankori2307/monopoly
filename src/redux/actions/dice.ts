import {ROLL_DICE, SET_DICE_SUM} from './actionTypes'


export function rollDice(diceData){
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