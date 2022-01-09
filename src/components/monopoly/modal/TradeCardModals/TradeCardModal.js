import {useEffect, useRef, useState} from 'react'
import { connect } from 'react-redux';
import CardList from './CardList';
import style from '../../../../assets/css/trade-card-modal.module.css'
import { genCardList, genCardListToOffer } from '../../../../utility/tradeCardModalUtils';
import PlayerMoneyAndInput from './AskOrSendMoney/PlayerMoneyAndInput';
import { offerTrade } from '../../../../redux/actions/trade';
import { setShowModal } from '../../../../redux/actions/modal';
import { modalTypes } from '../../../../utility/constants';

const TradeCardModal = ({siteData, totalPlayers, activePlayer, hideOnClick, offerTrade, setShowModal}) => {
    const isMounted = useRef(false)
    const [cardLists, setCardLists] = useState({
        currentPlayer: [],
        otherPlayer: [],
    })
    const [noOfSelectedCards, setNoOfSelectedCards] = useState({
        currentPlayer: 0,
        otherPlayer: 0,
    })
    const [playersDropdown, setPlayersDropdown] = useState([])
    const [selectedPlayerFromDropdown, setSelectedPlayerFromDropdown] = useState(null)
    const [askOrSendMoney, setAskOrSendMoney] = useState({
        ask: 0,
        send: 0,
    })


    useEffect(() => {
        if(!isMounted.current){
            var _playersDropdown = Array.from(Array(totalPlayers).keys()).filter(playerID => playerID!==activePlayer)
            setSelectedPlayerFromDropdown(_playersDropdown[0])
            setPlayersDropdown(_playersDropdown)
            isMounted.current = true
        }
        let currentPlayerCardList =  genCardList(siteData.playersSites[activePlayer])
        let otherPlayerCardList = genCardList(siteData.playersSites[selectedPlayerFromDropdown?selectedPlayerFromDropdown:_playersDropdown[0]])
        setCardLists({
            "currentPlayer": currentPlayerCardList,
            "otherPlayer": otherPlayerCardList
        })
    }, [activePlayer, selectedPlayerFromDropdown, siteData.playersSites, totalPlayers])

    const onSelect = (id, listName) => {
        let cardList = [...cardLists[listName]]
        let selectedCards = noOfSelectedCards[listName]
        for(let i=0; i<cardList.length;i++){
            if(cardList[i].site.id === id){
                selectedCards =  cardList[i].selected? selectedCards-1: selectedCards+1;
                cardList[i].selected = !cardList[i].selected
            }
        }
        setCardLists({
            ...cardLists,
            [listName]: cardList
        })
        setNoOfSelectedCards({
            ...noOfSelectedCards,
            [listName]:  selectedCards
        })
    }

    const setAskOrSendMoneyHelper = (type, value) => {
        let data = {}
        if(type === "ask"){
            data = {
                "ask": value,
                "send": 0,
            }
        } else if(type === "send"){
            data = {
                "send": value,
                "ask": 0,
            }
        }
        setAskOrSendMoney({
            ...data
        })
    }

    const onPlayerChange = (e) => {
        setSelectedPlayerFromDropdown(parseInt(e.target.value))
        setAskOrSendMoney({
            ask: 0,
            send: 0,
        })
    }
    const onOffer = (e) => {
        let data = genCardListToOffer(cardLists)
        offerTrade(selectedPlayerFromDropdown, activePlayer, data, askOrSendMoney.ask, askOrSendMoney.send)
        setShowModal(true, modalTypes.TRADE_CARDS_OFFER)
    }

    return (
        
        <div className={`${style.tradeCardModal} ${style.row}`}>
            { isMounted.current && <>
            <div className={`${style.cardLists} ${style.row}`}>
                <CardList cardList={cardLists["currentPlayer"]} listName={"currentPlayer"} onSelect={onSelect} selectedCards={noOfSelectedCards.currentPlayer} playerId={activePlayer}/>            
                <CardList cardList={cardLists["otherPlayer"]} listName={"otherPlayer"}  onSelect={onSelect} selectedCards={noOfSelectedCards.otherPlayer} playerId={selectedPlayerFromDropdown}/>            
            </div>
            <div className={style.controls}>
                <select name="cars" id="cars" className={style.playerDropdown} value={selectedPlayerFromDropdown} onChange={onPlayerChange}>
                    {playersDropdown.map(playerId => <option key={playerId} value={playerId}>Player{playerId}</option>)}
                </select>
                <div className={style.askOrSendMoney}>
                    <PlayerMoneyAndInput text="Snding" playerId={activePlayer} setAmount={setAskOrSendMoneyHelper} type="send" amount={askOrSendMoney.send}/>
                    <div className={style.or}><div /><span>or</span><div /></div>
                    <PlayerMoneyAndInput text="Asking" playerId={selectedPlayerFromDropdown} setAmount={setAskOrSendMoneyHelper} type="ask" amount={askOrSendMoney.ask}/>
                </div>
                <div className={`${style.btnContainer} ${style.row}`}>
                    <button className={`${style.btn} ${style.offer}`} onClick={onOffer} >Offer</button>
                    <button className={`${style.btn} ${style.cancel}`} onClick={hideOnClick}>Cancel</button>
                </div>
            </div>
            </>}   
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        siteData: store.siteData,
        totalPlayers: store.playersData.totalPlayers,
        activePlayer: store.playersData.activePlayer
    }
} 
const mapDispatchToProps = (dispatch) => {
    return {
        offerTrade: (to, from, cardLists, ask, send) => dispatch(offerTrade(to, from, cardLists, ask, send)),
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(TradeCardModal)