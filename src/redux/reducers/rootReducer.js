import {combineReducers} from 'redux'
import card from './card'
import player from './player'
import dice from './dice'
export default combineReducers({
    card,
    player,
    dice
})