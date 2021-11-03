import { siteDataIntialPlayersSites } from '../../utility/siteUtility';
import {BUILD_ON_SITE, BUY_SITE, MORTGAGE_SITE, REDEEM_SITE, SELL_BUILD, SET_SITES} from '../actions/actionTypes'
var initialState = {
    sites: [],
    boughtSites: [],
    boughtBy: Array(40).fill(null),
    playersSites: siteDataIntialPlayersSites(),
    noOfCardsInCategory: {}
}

initialState.boughtBy[1] = 0;
initialState.boughtBy[3] = 1; 
initialState.boughtBy[5] = 2; 
initialState.boughtBy[6] = 3; 
initialState.boughtBy[8] = 0; 
initialState.boughtBy[9] = 1; 
initialState.boughtBy[11] = 2;
initialState.boughtBy[12] = 3;
initialState.boughtBy[13] = 0;
initialState.boughtBy[14] = 1;
initialState.boughtBy[15] = 2;
initialState.boughtBy[16] = 3;
initialState.boughtBy[18] = 0;
initialState.boughtBy[19] = 1;
initialState.boughtBy[21] = 2;
initialState.boughtBy[23] = 3;
initialState.boughtBy[24] = 0;
initialState.boughtBy[25] = 1;
initialState.boughtBy[26] = 2;
initialState.boughtBy[27] = 3;
initialState.boughtBy[28] = 0;
initialState.boughtBy[29] = 1;
initialState.boughtBy[31] = 2;
initialState.boughtBy[32] = 3;
initialState.boughtBy[34] = 0;
initialState.boughtBy[35] = 1;
initialState.boughtBy[37] = 2;
initialState.boughtBy[39] = 3;
initialState.boughtSites = [1,3,5,6,8,9,11,12,13,14,15,16,18,19,21,23,24,25,26,27,28,29,31,32,34,35,37,39];

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
            let _noOfCardsInCategory = {};
            for(let i=0; i<payload.length; i++){
                let subType = payload[i].subType
                if(_noOfCardsInCategory[subType]) _noOfCardsInCategory[subType]++;
                else _noOfCardsInCategory[subType] = 1;
            }
            return {
                ...state,
                sites: payload,
                noOfCardsInCategory: _noOfCardsInCategory
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
        case BUILD_ON_SITE:
        case SELL_BUILD:
            {
            let _playersSites = {...state.playersSites}
            let curentPlayersSites = [..._playersSites[payload.playerId]]
            let _sites = [...state.sites]
            let _built = _sites[payload.siteId].built
            let buildFactor = 0;
            if(type===SELL_BUILD) buildFactor = -1;
            if(type===BUILD_ON_SITE) buildFactor = 1;
            _sites[payload.siteId].built = _built+buildFactor;
            
            for(let i=0; i<curentPlayersSites.length; i++){
                if(curentPlayersSites[i].id === payload.siteId){
                    curentPlayersSites[i].built = _built+buildFactor;
                }
            }
            _playersSites[payload.playerId] = curentPlayersSites
            
            return {
                ...state,
                sites:_sites,
                playersSites: _playersSites
            }  
            }
        default:
            return state
    }
}
export default site