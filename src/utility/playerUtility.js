
export const createPlayerData = (totalPlayers) => {
    let players = {}
    for(let player=0; player<totalPlayers; player++){
        players[player] = {
            site: 0,
            previousSite: 0,
            playerId: player,
            money: 1000
        }
    }


    return players
}



