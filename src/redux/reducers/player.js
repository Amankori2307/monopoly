import { MOVE_PLAYER, SET_TOTAL_PLAYERS } from "../actions/actionTypes";


const initialState = {
    activePlayer: 1,
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
                previousSite: currentPlayer.site,
                site: payload.site,
            }
            
            return {
                ...state,
                players: players,
                activePlayer: state.activePlayer===state.totalPlayers?1:state.activePlayer+1
            }
        case SET_TOTAL_PLAYERS:
            let tempPlayers = {}
            for(let player=1; player<=payload; player++){
                tempPlayers[player] = {
                    site: 1,
                    previousSite: 1,
                    playerId: player
                }
            }
            return {
                ...state,
                players: tempPlayers,
                totalPlayers: payload
            }

        default:
            return state;
    }
}
export default player