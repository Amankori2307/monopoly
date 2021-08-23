import {ROLL_DICE, SET_DICE_SUM} from '../actions/actionTypes'

const initialState = {
    dice1: 6,
    dice2: 6, 
    sum: 12
}

function dice(state=initialState, action){
    const {type, payload} = action;

    switch(type){
        case ROLL_DICE:
            return {
                ...state,
                dice1: payload.dice1,
                dice2: payload.dice2,
            }
        case SET_DICE_SUM:
            return {
                ...state,
                sum: state.dice1 + state.dice2
            }
        default:
            return state;

    }
}

export default dice