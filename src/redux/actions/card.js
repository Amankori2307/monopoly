import {SET_SHOW_MODAL, SET_CURRENT_CARD} from './actionTypes'

export const setShowModal = (payload) => {
    return {
        type: SET_SHOW_MODAL,
        payload: payload
    }
}

export const setCurrentCard = (cardData) => {
    return {
        type: SET_CURRENT_CARD,
        payload: cardData
    }
}