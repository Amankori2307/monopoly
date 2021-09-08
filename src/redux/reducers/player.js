import { CREDIT_PLAYER_MONEY, DEBIT_PLAYER_MONEY, MOVE_PLAYER, SET_ACTIVE_PLAYER, SET_TOTAL_PLAYERS } from "../actions/actionTypes";
import {createPlayerData} from '../../utility/playerUtility'
import { MAX_PLAYERS } from "../../utility/constants";

const initialState = {
    activePlayer: 0,
    totalPlayers: null,
    players:  createPlayerData(MAX_PLAYERS)
}

function player(state = initialState, action){
    const {type, payload} = action;
    switch(type){
        case MOVE_PLAYER:

            let players = state.players
            let currentPlayer = players[state.activePlayer]
            players[state.activePlayer] = {
                ...currentPlayer,
                previousSite: currentPlayer.site,
                site: payload.site,
            }
            return {
                ...state,
                players: players,
            }
        case SET_TOTAL_PLAYERS:
            return {
                ...state,
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
            _state = {...state}
            money = _state.players[payload.playerId].money
            _state.players[payload.playerId].money = money + payload.amount
            return {
                ..._state
            }
        default:
            return state;
    }
}
export default player