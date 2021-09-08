import {CREDIT_PLAYER_MONEY, DEBIT_PLAYER_MONEY, MOVE_PLAYER, SET_ACTIVE_PLAYER, SET_TOTAL_PLAYERS} from './actionTypes'


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