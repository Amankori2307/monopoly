import { directions, modalTypes, cardTypes, chestOrChanceActionTypes } from "../constants"
import { calcRent } from "../playerUtility"
import chestData from '../../assets/data/chestData.json'
import chanceData from '../../assets/data/chanceData.json'
import chestOrChanceLogicalFunctions from "./chestOrChanceLogicalFunctions"

export const checkIfUserCrossedStart = (cs, ps, direction, currentPlayerId, creditPlayerMoney) => {
    // Check if user crossed start(siteId === 0), if YES then add $200 credit 
    if (ps <= 39 && cs >= 0 && ps > cs && direction === directions.FORWARD){
        creditPlayerMoney(currentPlayerId, 200)
        console.log("+++++++++|Crossed START|++++++++")
    }
}

export const ifCurrentSiteIsOfTypeIsTax = (currentSite, currentPlayerId, debitPlayerMoney, setIsDone) => {
    debitPlayerMoney(currentPlayerId, currentSite.debit)
    setIsDone(true)
}

export const ifCurrentSiteIsOfTypeIsSpecial = (currentSiteId, currentPlayerId, debitPlayerMoney, setIsDone, movePlayer) => {
    if (currentSiteId === 10) { // If current site is jail
        debitPlayerMoney(currentPlayerId, 100);
        setIsDone(true);
    } else if (currentSiteId === 30) {
        movePlayer(currentPlayerId, 10, directions.BACKWARD)
    } else {
        setIsDone(true)
    }
}

export const ifCurrentSiteIsOfTypeIsSiteOrUtilityOrRealmRails = (currentSite, currentPlayer, activePlayer, siteData, diceSum, noOfCardsInCategory, debitPlayerMoney, creditPlayerMoney, setIsDone, setShowModal) => {
    let money = currentPlayer.money
    if (siteData.boughtSites.includes(currentSite.id)) {         let boughtBy = siteData.boughtBy[currentSite.id]
        if (!currentSite.isMortgaged && boughtBy !== currentPlayer.playerId) {
            let rent = calcRent(currentSite, siteData.playersSites[boughtBy], diceSum, noOfCardsInCategory);
            debitPlayerMoney(activePlayer, rent);
            creditPlayerMoney(boughtBy, rent);
        }
        setIsDone(true)
    } else {
        if (currentSite.sellingPrice <= money) {
            setShowModal(true, modalTypes.BUY_CARD)
        } else {
            setShowModal(true, modalTypes.AUCTION_CARD)
        }
    }
}


export const performAction = (action, currentPlayer, siteData, totalPlayers, debitPlayerMoney, creditPlayerMoney, movePlayer, setIsDone) => {
    if(action.type === chestOrChanceActionTypes.DEBIT){
        debitPlayerMoney(currentPlayer.playerId, action.amount)
        setIsDone(true)
    } else if(action.type === chestOrChanceActionTypes.CREDIT) {
        creditPlayerMoney(currentPlayer.playerId, action.amount)
        setIsDone(true)
    } else if(action.type === chestOrChanceActionTypes.MOVE) {
        movePlayer(currentPlayer.playerId, action.to, action.direction)
    } else if(action.type === chestOrChanceActionTypes.LOGICAL) {
        let logicalFunc = chestOrChanceLogicalFunctions[action.logicalId]
        if(action.logicalId===1) logicalFunc(currentPlayer, siteData.playersSites[currentPlayer.playerId], debitPlayerMoney, setIsDone)
        else if(action.logicalId===2) logicalFunc(currentPlayer, totalPlayers, debitPlayerMoney, creditPlayerMoney, setIsDone)
    }
}

export const ifCurrentSiteIsOfTypeIsChestOrChance = (currentPlayer, currentSite, diceSum, siteData, totalPlayers, debitPlayerMoney, creditPlayerMoney, movePlayer, setIsDone) => {
    let action = {}
    if(currentSite.type === cardTypes.CHEST) action = chestData[diceSum]
    else if(currentSite.type === cardTypes.CHANCE) action = chanceData[diceSum]

    performAction(action, currentPlayer, siteData, totalPlayers, debitPlayerMoney, creditPlayerMoney, movePlayer, setIsDone)    

}

export const appropriateActionHelper = (currentSite, currentPlayer, activePlayer, totalPlayers, siteData, diceSum, noOfCardsInCategory, debitPlayerMoney, creditPlayerMoney, setIsDone, setShowModal, movePlayer) => {
    if (currentSite.type === cardTypes.SITE || currentSite.type === cardTypes.REALM_RAILS || currentSite.type === cardTypes.UTILITY) {
        ifCurrentSiteIsOfTypeIsSiteOrUtilityOrRealmRails(currentSite, currentPlayer, activePlayer, siteData, diceSum, noOfCardsInCategory, debitPlayerMoney, creditPlayerMoney, setIsDone, setShowModal)
    } else if (currentSite.type === cardTypes.SPECIAL) {
        ifCurrentSiteIsOfTypeIsSpecial(currentSite.id, currentPlayer.playerId, debitPlayerMoney, setIsDone, movePlayer)
    } else if (currentSite.type === cardTypes.TAX) {
        ifCurrentSiteIsOfTypeIsTax(currentSite, currentPlayer.playerId, debitPlayerMoney, setIsDone)
    } else if (currentSite.type === cardTypes.CHEST || currentSite.type === cardTypes.CHANCE) {
        ifCurrentSiteIsOfTypeIsChestOrChance(currentPlayer, currentSite, diceSum, siteData, totalPlayers, debitPlayerMoney, creditPlayerMoney, movePlayer, setIsDone)
    }
    checkIfUserCrossedStart(currentPlayer.site, currentPlayer.previousSite, currentPlayer.direction, currentPlayer.playerId, creditPlayerMoney)
}