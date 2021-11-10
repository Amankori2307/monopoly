import { OFFER_TRADE } from "../actions/actionTypes"

const initialState = {
    from: null,
    to: null,
    cardLists: null,
    ask: null,
    send: null,
}

const trade = (state=initialState, action) => {
    const {type, payload} = action
    switch(type){
        case OFFER_TRADE:
            return {
                ...state,
                from: payload.from,
                to: payload.to,
                cardLists: payload.cardLists,
                ask: payload.ask,
                send: payload.send
            }
        default:
            return state
    }
} 

export default trade