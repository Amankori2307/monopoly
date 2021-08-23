import {ROLL_DICE} from './actionTypes'


export function rollDice(diceData){
    return {
        type: ROLL_DICE,
        payload: diceData
    }
}