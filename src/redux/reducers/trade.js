import { OFFER_TRADE } from "../actions/actionTypes"

var initialState = {
    from: null,
    to: null,
    cardLists: null,
    ask: null,
    send: null,
}

initialState = {
    from: 0,
    to: 1,
    cardLists: {
        receiving: [
            {
                id: 6,
                type: 'site',
                color: 'green',
                name: 'Kokiri Forest',
                sellingPrice: 100,
                textColorOnShow: 'black',
                rent: 6,
                rentWithHouse: [
                    30,
                    90,
                    270,
                    400,
                    550
                ],
                mortgage: 50,
                construction: 50,
                subType: 'green',
                isMortgaged: false,
                built: 0
            },
            {
                id: 12,
                type: 'utility',
                color: 'lightgrey',
                name: 'Windmill Hut',
                sellingPrice: 150,
                subType: 'utility',
                isMortgaged: false
            },
            {
                id: 16,
                type: 'site',
                color: 'orange',
                name: 'Haunted Westeland',
                sellingPrice: 180,
                textColorOnShow: 'black',
                rent: 14,
                rentWithHouse: [
                    70,
                    200,
                    550,
                    750,
                    950
                ],
                mortgage: 90,
                construction: 100,
                subType: 'orange',
                isMortgaged: false,
                built: 0
            }
        ],
        sending: [
            {
                id: 28,
                type: 'utility',
                color: 'lightgrey',
                name: 'Waterfall Cave',
                sellingPrice: 150,
                subType: 'utility',
                isMortgaged: false
            },
            {
                id: 34,
                type: 'site',
                color: 'skyblue',
                name: 'Water Temple',
                sellingPrice: 320,
                textColorOnShow: 'black',
                rent: 28,
                rentWithHouse: [
                    150,
                    450,
                    1000,
                    1200,
                    1400
                ],
                mortgage: 160,
                construction: 200,
                subType: 'skyblue',
                isMortgaged: false,
                built: 0
            }
        ]
    },
    ask: 0,
    send: 0
}
const trade = (state = initialState, action) => {
    const { type, payload } = action
    switch (type) {
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