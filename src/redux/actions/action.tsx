import { SET_ACTION } from "./actionTypes"

export const setAction = (active, currentAction) => {
    return {
        type: SET_ACTION,
        payload: {
            active,
            currentAction
        }
    }
}