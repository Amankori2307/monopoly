import {MOVE_PLAYER} from './actionTypes'


export function movePlayer(data){
    return {
        type: MOVE_PLAYER,
        payload: data
    }
}