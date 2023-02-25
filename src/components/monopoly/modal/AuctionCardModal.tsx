import style from '../../../assets/css/auction-card-modal.module.scss'
import CardModal from './CardModal'
import { connect } from 'react-redux';
import { useState } from 'react';
import { debitPlayerMoney } from '../../../redux/actions/player';
import { setIsDone } from '../../../redux/actions/board'
import { setShowModal } from '../../../redux/actions/modal'
import { buySite } from '../../../redux/actions/site'

const BID = "BID"
const FOLD = "FOLD"

const AuctionCardModal = ({ sites, card, totalPlayers, activePlayer, players, debitPlayerMoney, setShowModal, buySite, setIsDone }) => {

    const [playersFoldStatus, setPlayersFoldStatus] = useState(Array(totalPlayers).fill(false))
    const [biddingHistory, setBiddingHistory] = useState([])
    const [activeBidder, setActiveBidder] = useState(activePlayer)
    const [lastBid, setLastBid] = useState({
        playerId: null,
        bidAmount: 0
    })
    const [currentBidAmount, setCurrentBidAmount] = useState(1)


    const genBiddingHistory = (playerId, action) => {
        let statement = ""
        if (action === BID) statement = `Player${playerId} bids $${currentBidAmount}`
        else if (action === FOLD) statement = `Player${playerId} folded`
        setBiddingHistory(previousHistory => {
            return [...previousHistory, statement]
        })

    }
    const onBid = () => {
        let isValid = validateBid()
        if (isValid) {
            setLastBid({
                playerId: activeBidder,
                bidAmount: currentBidAmount,
            })
            genBiddingHistory(activeBidder, BID)
            setCurrentBidAmountHelper(currentBidAmount + 1)
            let playersWhoCanBid = getPlayersWhoCanBid(activeBidder, BID)
            setActiveBidderHelper(playersWhoCanBid)
        }

    }


    const onFold = () => {
        genBiddingHistory(activeBidder, FOLD)
        let playersWhoCanBid = getPlayersWhoCanBid(activeBidder, FOLD);
        setActiveBidderHelper(playersWhoCanBid)
    }


    // Called When Bid Amount Changes
    const onBidAmountChange = (e) => {
        setCurrentBidAmountHelper(e.target.value)
    }

    // To Validate bid amount e.g., to ensure bid amount is greater than existing bid and less than the money user currenly have
    const validateBid = () => {

        if (currentBidAmount > lastBid.bidAmount && currentBidAmount <= players[activeBidder].money) return true
        else {
            setCurrentBidAmount(lastBid.bidAmount + 1)
            return false;
        }
    }

    // To ensure bid amount is of int type
    const setCurrentBidAmountHelper = (bidAmount) => {
        setCurrentBidAmount(parseInt(bidAmount))
    }

    // Set active bidder helper
    const setActiveBidderHelper = (playersWhoCanBid) => {
        if (playersWhoCanBid.length === 1) {
            wonAuction(playersWhoCanBid[0])
        }
        else if (playersWhoCanBid.length === 0) {
            // If current bidder bids higher then anyone can, because no as more money than current bid
            wonAuction(activeBidder)
        }
        else {
            let nextBidder = getNextBidder(playersWhoCanBid);
            setActiveBidder(nextBidder)
        }
    }

    // getNextBidder
    const getNextBidder = (playersWhoCanBid) => {
        for (let i = 1; i < totalPlayers; i++) {
            let nextBidder = (activeBidder + i) % totalPlayers;
            if (playersWhoCanBid.indexOf(nextBidder) !== -1) return nextBidder
        }
    }

    const getPlayersWhoCanBid = (playerId, action) => {
        let _playersFoldStatus = [...playersFoldStatus]
        let playersWhoCanBid = [];

        if (action === FOLD) _playersFoldStatus[playerId] = true

        for (let playerId = 0; playerId < totalPlayers; playerId++) {
            if (!checkIfPlayerCanBid(playerId, _playersFoldStatus)) {
                _playersFoldStatus[playerId] = true;
            } else {
                playersWhoCanBid.push(playerId)
            }
        }
        setPlayersFoldStatus(_playersFoldStatus);
        return playersWhoCanBid;
    }
    // const check if player can bid
    const checkIfPlayerCanBid = (playerId, _playersFoldStatus) => {
        if ((_playersFoldStatus[playerId] === false) && (players[playerId].money > currentBidAmount)) return true;
        else return false;
    }
    const wonAuction = (playerId) => {
        debitPlayerMoney(playerId, currentBidAmount);
        buySite(playerId, sites[card]);
        setIsDone(true);
        setShowModal(false, null);
    }
    return (
        <div className={`${style.auction} ${style.row}`}>
            <CardModal card={sites[card]} />

            <div className={`${style.auctionDetails}`}>
                <div>
                    <p className={`${style.heading}`}>Action</p>
                    <ul className={`${style.biddingHistory}`}>
                        {
                            biddingHistory.length < totalPlayers
                                ? biddingHistory.map((item, index) => <li key={index}>{item}</li>)
                                : biddingHistory.slice(-totalPlayers).map((item, index) => <li key={index}>{item}</li>)
                        }
                        <li>Player{activeBidder} is bidding...</li>
                    </ul>
                </div>
                <div>
                    <p className={style.bidAmount}>
                        <label htmlFor="currentBidAmount">Bid Amount:</label>
                        <span className={style.bgWhite}>$</span>
                        <input id="currentBidAmount" type="number" value={currentBidAmount} onChange={onBidAmountChange} />
                    </p>
                    <p className={style.playerMoney}>
                        Money: <del className={style.actualMoney}>${players[activeBidder].money}</del>
                        <ins className={style.moneyAfterBidDeuction}>${players[activeBidder].money - (currentBidAmount ? currentBidAmount : 0)}</ins></p>
                    <div className={`${style.btnContainer} ${style.row}`}>
                        <button className={`${style.btn} ${style.bid}`} onClick={onBid}>Bid</button>
                        <button className={`${style.btn} ${style.fold}`} onClick={onFold}>Fold</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        sites: store.siteData.sites,
        totalPlayers: store.playersData.totalPlayers,
        activePlayer: store.playersData.activePlayer,
        players: store.playersData.players
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        debitPlayerMoney: (playerId, amount) => dispatch(debitPlayerMoney(playerId, amount)),
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
        buySite: (playerId, siteData) => dispatch(buySite(playerId, siteData)),
        setIsDone: (isDone) => dispatch(setIsDone(isDone)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(AuctionCardModal) 