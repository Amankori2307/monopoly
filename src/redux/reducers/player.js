import { MOVE_PLAYER } from "../actions/actionTypes";

const createPlayerInitialData = (totalPlayers) => {
    let players = {}
    for(let player=1; player<=totalPlayers; player++){
        players[player] = {
            site: 1,
            previousSite: 1,
            top:null,
            right: null,
            bottom: null,
            left:null
        }
    }
    return players
}
const initialState = {
    activePlayer: 1,
    totalPlayers: 1,
    players:  createPlayerInitialData(1)
}

function player(state = initialState, action){
    const {type, payload} = action;
    switch(type){
        case MOVE_PLAYER:
            let players = state.players

            let currentPlayer = players[state.activePlayer]
            players[state.activePlayer] = {
                previousSite: currentPlayer.site,
                top: payload.top,
                right: payload.right,
                bottom: payload.bottom,
                left: payload.left,
                site: payload.site,
            }
            console.log(state)
            
            return {
                ...state,
                players: players,
                activePlayer: state.activePlayer===state.totalPlayers?1:state.activePlayer+1
            } 
        default:
            return state;
    }
}
export default player