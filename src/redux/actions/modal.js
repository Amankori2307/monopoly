import { SET_PLAYER_ID_FOR_MY_CARDS_MODAL, SET_SHOW_MODAL } from './actionTypes'

export const setShowModal = (showModal, currentModal) => {
    return {
        type: SET_SHOW_MODAL,
        payload: {
            showModal,
            currentModal
        }
    }
}

export const setPlayerIdForMyCardsModal = (playerId) => {
    return {
        type: SET_PLAYER_ID_FOR_MY_CARDS_MODAL,
        payload: playerId
    }
}
