import { SET_BOARD_SIZE } from "../actions/actionTypes";

const initialState = {
    side: null,
    rowWidth: null
}

export default function board(state=initialState, action){
    const {type, payload} = action;
    switch(type){
        case SET_BOARD_SIZE:
            return {
                ...state,
                side: payload.side,
                rowWidth: payload.rowWidth
            }
        default:
            return state
    }
}