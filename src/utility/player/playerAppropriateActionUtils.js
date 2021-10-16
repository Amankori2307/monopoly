import { directions } from "../constants"

export const checkIfUserCrossedStart = (cs, ps, direction, currentPlayerId, creditPlayerMoney) => {
    // Check if user crossed start(siteId === 0), if YES then add $200 credit 
    if (ps <= 39 && cs >= 0 && ps > cs && direction === directions.FORWARD) creditPlayerMoney(currentPlayerId, 200)
}