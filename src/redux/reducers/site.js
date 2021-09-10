import { siteDataIntialPlayersSites } from '../../utility/siteUtility';
import {BUY_SITE, SET_SITES} from '../actions/actionTypes'
const initialState = {
    sites: [],
    boughtSites: [],
    boughtBy: Array(40).fill(null),
    playersSites: siteDataIntialPlayersSites()
}

function site(state=initialState, action){
    const {type, payload} = action;
    switch(type){
        case BUY_SITE:
            let _boughtBy = [...state.boughtBy]
            _boughtBy[payload.siteData.id] = payload.playerId
            return {
                ...state,
                boughtSites: [...state.boughtSites, payload.siteData.id],
                boughtBy: _boughtBy,
                playersSites: {
                    ...state.playersSites,
                    [payload.playerId]: [...state.playersSites[payload.playerId], payload.siteData]
                }
            }
        case SET_SITES:
            return {
                ...state,
                sites: payload
            }
        default:
            return state
    }
}
export default site