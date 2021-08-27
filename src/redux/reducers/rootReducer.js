import {combineReducers} from 'redux'
import card from './card'
import player from './player'
import dice from './dice'
import board from './board'
export default combineReducers({
    card,
    playersData: player,
    dice,
    board
})