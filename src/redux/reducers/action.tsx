import { SET_ACTION } from "../actions/actionTypes";

const initialState = {
    active: false,
    currentAction: null
}

const action = (state= initialState, action) => {
    const {type, payload} = action;
    switch(type){
        case SET_ACTION:
            return {
                ...state,
                currentAction: payload.currentAction,
                active: payload.active
            }
        default:
            return state
    }
}

export default action