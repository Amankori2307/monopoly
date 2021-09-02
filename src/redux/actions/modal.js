import { SET_SHOW_MODAL } from './actionTypes'

export const setShowModal = (showModal, currentModal) => {
    return {
        type: SET_SHOW_MODAL,
        payload: {
            showModal,
            currentModal
        }
    }
}