import {SET_CURRENT_CARD, SET_SHOW_MODAL} from '../actions/actionTypes'

const initialState = {
    showModal: false,
    currentCard: {}
}

export default function cardReducer(state = initialState, action) {
    const {type, payload} = action
    switch(type){
        case SET_SHOW_MODAL:
            return {
                ...state,
                showModal: payload
            }
        case SET_CURRENT_CARD:
            return {
                ...state,
                currentCard: payload
            }
        default:
            return state;
    }
}