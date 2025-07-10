function getNoOfHotelAndHouses(sites){
    let noOfHotelAndHouses = 0;
    sites.forEach(site => {
        noOfHotelAndHouses += (site.built?site.built:0)
    })
    return noOfHotelAndHouses
}

const chestOrChanceLogicalFunctions = {
    "1": function(currentPlayer, currentPlayerSites, debitPlayerMoney, setIsDone){
        let noOfHotelAndHouses = getNoOfHotelAndHouses(currentPlayerSites)
        let amount = noOfHotelAndHouses*20;
        debitPlayerMoney(currentPlayer.playerId, amount)
        setIsDone(true)
    },
    "2": function(currentPlayer, totalPlayers, debitPlayerMoney, creditPlayerMoney, setIsDone){
        creditPlayerMoney(currentPlayer.playerId, (totalPlayers-1)*10)
        Array.from(Array(totalPlayers).keys()).forEach(playerId => {
            if(playerId !== currentPlayer.playerId){
                debitPlayerMoney(playerId, 10)
            }
        })
        setIsDone(true)
    }
}

export default chestOrChanceLogicalFunctions