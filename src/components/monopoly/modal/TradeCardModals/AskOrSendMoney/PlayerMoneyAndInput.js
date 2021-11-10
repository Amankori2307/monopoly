import React from 'react'
import { connect } from 'react-redux'
import style from '../../../../../assets/css/player-money-and-input.module.css'

 const PlayerMoneyAndInput = ({players, text, playerId, setAmount, type, amount}) => {
    const money =players[playerId].money;

    const onBidAmountChange = (e) => {
        setAmount(type, e.target.value)
    }

    const checkIfValidBid = (e) => {
        let _amount = amount? parseInt(amount): 0;
        if(_amount >money){
            setAmount(type, 0)
        }
    }
    return (
        <div className={style.playerMoneyAndInput}>
            <p className={style.amount}>
                <label htmlFor="currentBidAmount">{text}:</label>
                <span className={style.bgWhite}>$</span>
                <input id="currentBidAmount" type="number" value={amount}  onChange={onBidAmountChange} onBlur={checkIfValidBid}/>
            </p>
            <p className={style.playerMoney}>
                Player{playerId} Money: <del className={style.actualMoney}>${money}</del>
                <ins className={style.moneyAfterBidDeuction}>${money-(amount?amount:0)}</ins>
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