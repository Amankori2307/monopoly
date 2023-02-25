import {ROLL_DICE, SET_DICE_SUM} from '../actions/actionTypes'

const initialState = {
    dice1: 6,
    dice2: 6, 
    diceSum: null,
    setDiceSumCalledCount: 1 // to identify if if SET_DICE_SUM was triggered
    
}

function dice(state=initialState, action){
    const {type, payload} = action;

    switch(type){
        case ROLL_DICE:
            return {
                ...state,
                dice1: payload.dice1,
                dice2: payload.dice2,
                setDiceSumCalledCount: state.setDiceSumCalledCount+1,
                diceSum: payload.dice1 + payload.dice2
            }
        case SET_DICE_SUM:
            return {
                ...state,
                setDiceSumCalledCount: state.setDiceSumCalledCount+1,
                diceSum: state.dice1 + state.dice2
            }
        default:
            return state;

    }
}

export default dice