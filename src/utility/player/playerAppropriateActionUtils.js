import { directions } from "../constants"

export const checkIfUserCrossedStart = (cs, ps, direction, currentPlayerId, creditPlayerMoney) => {
    // Check if user crossed start(siteId === 0), if YES then add $200 credit 
    if (ps <= 39 && cs >= 0 && ps > cs && direction === directions.FORWARD) creditPlayerMoney(currentPlayerId, 200)
}

export const ifCurrentSiteIsOfSubTypeIsTAX = (currentSite, currentPlayerId, debitPlayerMoney, setIsDone) => {
    debitPlayerMoney(currentPlayerId, currentSite.debit)
    setIsDone(true)
}
export const ifCurrentSiteIsOfSubTypeIsSPECIAL = (currentSiteId, currentPlayerId, debitPlayerMoney, setIsDone, movePlayer) => {
    if (currentSiteId === 10) { // If current site is jail
        debitPlayerMoney(currentPlayerId, 100);
        setIsDone(true);
    } else if (currentSiteId === 30) {
        movePlayer(currentPlayerId, 10, directions.BACKWARD)
    } else {
        setIsDone(true)
    }
}
