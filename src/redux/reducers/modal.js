import {SET_SHOW_MODAL} from '../actions/actionTypes'
const initialState = {
    showModal:  false,
    currentModal: null
}

function modal(state=initialState, action){
    const {type, payload} = action;
    switch(type){
        case SET_SHOW_MODAL:
            return {
                ...state,
                ...payload
            }
        default:
            return state
    }
}
export default modal