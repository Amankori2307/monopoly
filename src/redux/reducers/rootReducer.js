import {combineReducers} from 'redux'
import card from './card'
import player from './player'
import dice from './dice'
import board from './board'
import modal from './modal'
import site from './site'
import action from './action'
export default combineReducers({
    card,
    playersData: player,
    dice,
    board,
    modalData: modal,
    siteData: site,
    actionData: action
})