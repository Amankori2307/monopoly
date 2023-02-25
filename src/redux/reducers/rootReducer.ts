import {combineReducers} from 'redux'
import card from './card'
import player from './player'
import dice from './dice'
import { boardReducer, IBoard }from '@monopoly/lib//core'
import modal from './modal'
import site from './site'
import action from './action'

export interface IState  {
    board: IBoard
}

export default combineReducers({
    card,
    playersData: player,
    dice,
    board: boardReducer,
    modalData: modal,
    siteData: site,
    actionData: action
})