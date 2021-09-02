import {MOVE_PLAYER, SET_ACTIVE_PLAYER, SET_TOTAL_PLAYERS} from './actionTypes'


export function movePlayer(data){
    return {
        type: MOVE_PLAYER,
        payload: data
    }
}

export function setTotalPlayers(data){
    return {
        type: SET_TOTAL_PLAYERS,
        payload: data
    }
}

export function setActivePlayer(){
    return {
        type: SET_ACTIVE_PLAYER,
        payload: null
    }
}