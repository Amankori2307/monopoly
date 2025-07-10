import {SET_CURRENT_CARD} from '../actions/actionTypes'

const initialState = {
    showModal: false,
    currentCard: {}
}

export default function cardReducer(state = initialState, action) {
    const {type, payload} = action
    switch(type){
 
        case SET_CURRENT_CARD:
            return {
                ...state,
                currentCard: payload
            }
        default:
            return state;
    }
}