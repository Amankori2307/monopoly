import {ROLL_DICE} from '../actions/actionTypes'

const initialState = {
    dice1: 6,
    dice2: 6, 
}

function dice(state=initialState, action){
    const {type, payload} = action;

    switch(type){
        case ROLL_DICE:
            return {
                ...state,
                dice1: payload.dice1,
                dice2: payload.dice2
            }
        default:
            return state;
            break;

    }
}

export default dice