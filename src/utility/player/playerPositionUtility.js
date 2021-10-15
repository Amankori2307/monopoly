export const calculatePlayersOnCurrentSite = (site, players, totalPlayers) => {
    let playersOnCurrentSite = {
        playerIds: [],
        count: 0
    };
    for (let playerId = 0; playerId < totalPlayers; playerId++) {
        if (players[playerId].site === site) {
            playersOnCurrentSite.count++;
            playersOnCurrentSite.playerIds.push(playerId)
        }
    }
    return playersOnCurrentSite;
}