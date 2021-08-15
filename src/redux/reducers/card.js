import {SET_SHOW_MODAL} from '../actions/actionTypes'

const initialState = {
    showModal: false,
    currentCard: null
}

export default function cardReducer(state = initialState, action) {
    const {type, payload} = action
    switch(type){
        case SET_SHOW_MODAL:
            return {
                ...state,
                showModal: payload
            }
        default:
            return state;
    }
}