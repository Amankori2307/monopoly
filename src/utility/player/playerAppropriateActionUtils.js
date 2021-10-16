import { directions, modalTypes, cardTypes } from "../constants"
import { calcRent } from "../playerUtility"

export const checkIfUserCrossedStart = (cs, ps, direction, currentPlayerId, creditPlayerMoney) => {
    // Check if user crossed start(siteId === 0), if YES then add $200 credit 
    if (ps <= 39 && cs >= 0 && ps > cs && direction === directions.FORWARD) creditPlayerMoney(currentPlayerId, 200)
}

export const ifCurrentSiteIsOfSubTypeIsTax = (currentSite, currentPlayerId, debitPlayerMoney, setIsDone) => {
    debitPlayerMoney(currentPlayerId, currentSite.debit)
    setIsDone(true)
}

export const ifCurrentSiteIsOfSubTypeIsSpecial = (currentSiteId, currentPlayerId, debitPlayerMoney, setIsDone, movePlayer) => {
    if (currentSiteId === 10) { // If current site is jail
        debitPlayerMoney(currentPlayerId, 100);
        setIsDone(true);
    } else if (currentSiteId === 30) {
        movePlayer(currentPlayerId, 10, directions.BACKWARD)
    } else {
        setIsDone(true)
    }
}

export const ifCurrentSiteIsOfSubTypeIsSiteOrUtilityOrRealmRails = (currentSite, currentPlayer, activePlayer, siteData, diceSum, noOfCardsInCategory, debitPlayerMoney, creditPlayerMoney, setIsDone, setShowModal) => {
    let money = currentPlayer.money
    if (siteData.boughtSites.includes(currentSite.id)) {         let boughtBy = siteData.boughtBy[currentSite.id]
        if (!currentSite.isMortgaged && boughtBy !== currentPlayer.id) {
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

export const appropriateActionHelper = (currentSite, currentPlayer, activePlayer, siteData, diceSum, noOfCardsInCategory, debitPlayerMoney, creditPlayerMoney, setIsDone, setShowModal, movePlayer) => {
    if ([cardTypes.SITE, cardTypes.REALM_RAILS, cardTypes.UTILITY].includes(currentSite.type)) {
        ifCurrentSiteIsOfSubTypeIsSiteOrUtilityOrRealmRails(currentSite, currentPlayer, activePlayer, siteData, diceSum, noOfCardsInCategory, debitPlayerMoney, creditPlayerMoney, setIsDone, setShowModal)
    } else if (currentSite.type === cardTypes.SPECIAL) {
        ifCurrentSiteIsOfSubTypeIsSpecial(currentSite.id, currentPlayer.id, debitPlayerMoney, setIsDone, movePlayer)
    } else if (currentSite.type === cardTypes.TAX) {
        ifCurrentSiteIsOfSubTypeIsTax(currentSite, currentPlayer.id, debitPlayerMoney, setIsDone)
    }
    checkIfUserCrossedStart(currentPlayer.site, currentPlayer.previousSite, currentPlayer.direction, currentPlayer.id, creditPlayerMoney)
}