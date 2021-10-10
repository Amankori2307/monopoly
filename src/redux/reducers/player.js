import { CREDIT_PLAYER_MONEY, DEBIT_PLAYER_MONEY, MOVE_PLAYER, SET_ACTIVE_PLAYER, SET_IS_MOVING, SET_TOTAL_PLAYERS } from "../actions/actionTypes";
import {createPlayerData} from '../../utility/playerUtility'

const initialState = {
    activePlayer: 0,
    totalPlayers: null,
    players: {} 
}

function player(state = initialState, action){
    const {type, payload} = action;
    switch(type){
        case MOVE_PLAYER:
            let players = state.players
            let currentPlayer = players[payload.playerId]
            players[payload.playerId] = {
                ...currentPlayer,
                previousSite: currentPlayer.site,
                site: payload.currentSite,
                isMoving: true,
                direction: payload.direction
            }
            return {
                ...state,
                players: players,
            }
        case SET_TOTAL_PLAYERS:
            return {
                ...state,
                players: createPlayerData(payload),
                totalPlayers: payload
            }
        case SET_ACTIVE_PLAYER:
            return {
                ...state,
                activePlayer: (state.activePlayer+1)%state.totalPlayers
            }
        case DEBIT_PLAYER_MONEY:
            let _state = {...state}
            let money = _state.players[payload.playerId].money
            _state.players[payload.playerId].money = money - payload.amount
            return {
                ..._state
            }        
        case CREDIT_PLAYER_MONEY:
            {
                let _players = {...state.players}
                let currentPlayer = {...state.players[payload.playerId]}
                let money = currentPlayer.money
                currentPlayer.money = money + payload.amount
                _players[payload.playerId] = currentPlayer;
                return {
                    ...state,
                    players: _players
                }
            }
        case SET_IS_MOVING:
            {
                let _state = {...state}
                _state.players[payload.playerId].isMoving = payload.isMoving;
                return {
                    ..._state
                }
            }
        default:
            return state;
    }
}
export default player