import { MOVE_PLAYER } from "../actions/actionTypes";

const initialState = {
    site: 1,
    top:null,
    right: 45,
    bottom: 45,
    left:null
    
}

function player(state = initialState, action){
    const {type, payload} = action;
    switch(type){
        case MOVE_PLAYER:
            return {
                ...state,
                top: payload.top,
                right: payload.right,
                bottom: payload.bottom,
                left: payload.left,
                site: payload.site,
            } 
        default:
            return state;
    }
}
export default player