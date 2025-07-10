import { BUILD_ON_SITE, BUY_SITE, MORTGAGE_SITE, REDEEM_SITE, SELL_BUILD, SET_SITES } from './actionTypes'

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
            playerId: playerId,
            isMortgaged: true
        }
    }
}

export const redeemSite = (siteId, playerId) => {
    return {
        type: REDEEM_SITE,
        payload: {
            siteId: siteId,
            playerId: playerId,
            isMortgaged: false
        }
    }
}

export const buildOnSite = (siteId, playerId) => {
    return {
        type: BUILD_ON_SITE,
        payload: {
            siteId: siteId,
            playerId: playerId,
            
        }
    }
}


export const sellBuild = (siteId, playerId) => {
    return {
        type: SELL_BUILD,
        payload: {
            siteId: siteId,
            playerId: playerId,
        }
    }
}
