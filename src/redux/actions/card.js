import {SET_SHOW_MODAL} from './actionTypes'

export const setShowModal = (payload) => {
    return {
        type: SET_SHOW_MODAL,
        payload: payload
    }
}