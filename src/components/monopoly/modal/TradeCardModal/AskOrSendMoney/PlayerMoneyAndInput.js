import React, {useState} from 'react'
import { connect } from 'react-redux'
import style from '../../../../../assets/css/player-money-and-input.module.css'

 const PlayerMoneyAndInput = ({players}) => {
    const [currentBidAmount, setCurrentBidAmount] = useState(0)
    const playerId = 0
    const money = players[playerId].money
    // Called When Bid Amount Changes
    const onBidAmountChange = (e) => {
        setCurrentBidAmountHelper(e.target.value)
    }

    // To ensure bid amount is of int type
    const setCurrentBidAmountHelper = (bidAmount) => {
        setCurrentBidAmount(parseInt(bidAmount))
    }

    return (
        <div className={style.playerMoneyAndInput}>
            <p className={style.amount}>
                <label htmlFor="currentBidAmount">Bid Amount:</label>
                <span className={style.bgWhite}>$</span>
                <input id="currentBidAmount" type="number" value={currentBidAmount}  onChange={onBidAmountChange}/>
            </p>
            <p className={style.playerMoney}>
                Money: <del className={style.actualMoney}>${money}</del>
                <ins className={style.moneyAfterBidDeuction}>${money-(currentBidAmount?currentBidAmount:0)}</ins>
            </p>
        </div>
    )
}

const mapStateToProps = (store) => {
    return {
        players: store.playersData.players
    }
}

const mapDispatchToProps = (dispatch) => {
    return {

    }
}
export default connect(mapStateToProps, mapDispatchToProps)(PlayerMoneyAndInput)