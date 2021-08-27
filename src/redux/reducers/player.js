import { MOVE_PLAYER, SET_ACTIVE_PLAYER, SET_TOTAL_PLAYERS } from "../actions/actionTypes";


const initialState = {
    activePlayer: 0,
    totalPlayers: null,
    players:  null
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
            let tempPlayers = {}
            for(let player=0; player<payload; player++){
                tempPlayers[player] = {
                    site: 0,
                    previousSite: 0,
                    playerId: player
                }
            }
            return {
                ...state,
                players: tempPlayers,
                totalPlayers: payload
            }
        case SET_ACTIVE_PLAYER:
            return {
                ...state,
                activePlayer: (state.activePlayer+1)%state.totalPlayers
            }
        default:
            return state;
    }
}
export default player