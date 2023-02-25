import { SET_CURRENT_CARD} from './actionTypes'

export const setCurrentCard = (cardData) => {
    return {
        type: SET_CURRENT_CARD,
        payload: cardData
    }
}