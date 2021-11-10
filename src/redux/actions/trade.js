import {OFFER_TRADE} from './actionTypes'
export const offerTrade = (to, from, cardLists, ask, send) => {
    return {
        type: OFFER_TRADE,
        payload: {
            to,
            from,
            cardLists,
            ask,
            send
        }
    }
}