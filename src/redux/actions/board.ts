import {SET_BOARD_SIZE, CALC_SITE_POSITIONS, SET_IS_DONE} from './actionTypes'

export function setBoardSize(data){
    return ({
        type: SET_BOARD_SIZE,
        payload: data
    });
}

export function calculateSitePositions(data){
    return {
        type: CALC_SITE_POSITIONS,
        payload: data
    }
}

export function setIsDone(isDone){
    return {
        type: SET_IS_DONE,
        payload: isDone
    }
}