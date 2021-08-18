import {SET_CURRENT_CARD, SET_SHOW_MODAL} from '../actions/actionTypes'

const initialState = {
    showModal: true,
    currentCard: {
        "id": 2,
        "type": "site",
        "color": "brown",
        "textColorOnShow": "white",
        "name": "Minish Woods",
        "sellingPrice": 60,
        "rent": 2,
        "mortgage": 30,
        "construction": 50,
        "rentWithHouse": [ 10, 30, 90, 160, 250 ]
    }
}

export default function cardReducer(state = initialState, action) {
    const {type, payload} = action
    switch(type){
        case SET_SHOW_MODAL:
            return {
                ...state,
                showModal: payload
            }
        case SET_CURRENT_CARD:
            return {
                ...state,
                currentCard: payload
            }
        default:
            return state;
    }
}