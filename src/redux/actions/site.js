import { BUY_SITE, MORTGAGE_SITE, SET_SITES } from './actionTypes'

export const buySite = (playerId, siteData) => {
    return {
        type: BUY_SITE,
        payload: {
            siteData,
            playerId
        }
    }
}

export const setSites = (data) => {
    return {
        type: SET_SITES,
        payload: data
    }
}

export const mortgageSite = (siteId, playerId) => {
    return {
        type: MORTGAGE_SITE,
        payload: {
            siteId: siteId,
            playerId: playerId
        }
    }
}