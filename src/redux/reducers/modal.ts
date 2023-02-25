import {SET_PLAYER_ID_FOR_MY_CARDS_MODAL, SET_SHOW_MODAL} from '../actions/actionTypes'
const initialState = {
    showModal: false,
    currentModal: null,
    playerIdForMyCardsModal: null
}

function modal(state=initialState, action){
    const {type, payload} = action;
    switch(type){
        case SET_SHOW_MODAL:
            return {
                ...state,
                ...payload
            }
        case SET_PLAYER_ID_FOR_MY_CARDS_MODAL:
            return {
                ...state,
                playerIdForMyCardsModal: payload
            }
        default:
            return state
    }
}
export default modal