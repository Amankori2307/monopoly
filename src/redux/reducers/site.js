import { siteDataIntialPlayersSites } from '../../utility/siteUtility';
import {BUY_SITE, MORTGAGE_SITE, REDEEM_SITE, SET_SITES} from '../actions/actionTypes'
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
        case MORTGAGE_SITE:
        case REDEEM_SITE:
            let _playersSites = {...state.playersSites}
            let curentPlayersSites = [..._playersSites[payload.playerId]]
            let _sites = [...state.sites]
            _sites[payload.siteId].isMortgaged = payload.isMortgaged
            
            for(let i=0; i<curentPlayersSites.length; i++){
                if(curentPlayersSites[i].id === payload.siteId){
                    curentPlayersSites[i].isMortgaged = payload.isMortgaged;
                }
            }
            _playersSites[payload.playerId] = curentPlayersSites
            
            return {
                ...state,
                sites:_sites,
                playersSites: _playersSites
            }  
        default:
            return state
    }
}
export default site