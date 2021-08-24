import {SET_BOARD_SIZE} from './actionTypes'

export function setBoardSize(data){
    return ({
        type: SET_BOARD_SIZE,
        payload: data
    });
}