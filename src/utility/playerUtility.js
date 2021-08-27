const createPlayerData = (totalPlayers) => {
    let players = {}
    for(let player=1; player<=totalPlayers; player++){
        players[player] = {
            site: 1,
            previousSite: 1,
            playerId: player
        }
    }
    return players
}