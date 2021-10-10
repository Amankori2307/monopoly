import {CREDIT_PLAYER_MONEY, DEBIT_PLAYER_MONEY, MOVE_PLAYER, SET_ACTIVE_PLAYER, SET_IS_MOVING, SET_TOTAL_PLAYERS} from './actionTypes'


export function movePlayer(playerId, currentSite, direction){
    return {
        type: MOVE_PLAYER,
        payload: {
            playerId,
            currentSite,
            direction
        }
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

export function debitPlayerMoney(playerId, amount){
    return {
        type: DEBIT_PLAYER_MONEY,
        payload: {
            playerId,
            amount
        }
    }
}
export function creditPlayerMoney(playerId, amount){
    return {
        type: CREDIT_PLAYER_MONEY,
        payload: {
            playerId,
            amount
        }
    }
}

export function setIsMoving(playerId, isMoving){
    return {
        type: SET_IS_MOVING,
        payload: {
            playerId: playerId,
            isMoving: isMoving
        }
    }
}