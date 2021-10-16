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
    }
}

export default chestOrChanceLogicalFunctions