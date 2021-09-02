import { BUY_SITE, SET_SITES } from './actionTypes'

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