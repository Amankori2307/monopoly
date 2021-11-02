import {useEffect, useState} from 'react'
import { connect } from 'react-redux';
import { cardTypes } from '../../../../utility/constants';
import CardList from './CardList';
import style from '../../../../assets/css/trade-card-modal.module.css'
import { genCardList } from '../../../../utility/tradeCardModalUtils';
import PlayerMoneyAndInput from './AskOrSendMoney/PlayerMoneyAndInput';

const TradeCardModal = ({siteData, totalPlayers, activePlayer}) => {
    const [cardLists, setCardLists] = useState({
        currentPlayer: [],
        otherPlayer: [],
    })
    const [noOfSelectedCards, setNoOfSelectedCards] = useState({
        currentPlayer: 0,
        otherPlayer: 0,
    })
    const [playersDropdown, setPlayersDropdown] = useState([])
    const [selectedPlayerFromDropdown, setSelectedPlayerFromDropdown] = useState(activePlayer)
    const [askOrSendMoney, setAskOrSendMoney] = useState({
        ask: 0,
        send: 0,
    })
    useEffect(() => {       
        let players = Array.from(Array(totalPlayers).keys()).filter(playerID => playerID!==activePlayer)
        setSelectedPlayerFromDropdown(players[0])
        setPlayersDropdown(players)
    }, [totalPlayers, activePlayer])

    useEffect(() => {
        let sites = siteData.sites.filter(site => site.type === cardTypes.SITE || site.type === cardTypes.REALM_RAILS || site.type === cardTypes.UTILITY )
        let currentPlayerCardList, otherPlayerCardList;
        currentPlayerCardList = genCardList(sites.slice(0,5))
        otherPlayerCardList = genCardList(sites.slice(5*selectedPlayerFromDropdown,5*(selectedPlayerFromDropdown+1)))
        setCardLists({
            "currentPlayer": currentPlayerCardList,
            "otherPlayer": otherPlayerCardList
        })

    }, [selectedPlayerFromDropdown, siteData.sites])
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
            listName: cardList
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
    return (
        <div className={`${style.tradeCardModal} ${style.row}`}>
            <div className={`${style.cardLists} ${style.row}`}>
                <CardList cardList={cardLists["currentPlayer"]} listName={"currentPlayer"} onSelect={onSelect} selectedCards={noOfSelectedCards.currentPlayer} playerId={0}/>            
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
                    <button className={`${style.btn} ${style.offer}`} >Offer</button>
                    <button className={`${style.btn} ${style.cancel}`} >Cancel</button>
                </div>
            </div>
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

    }
}

export default connect(mapStateToProps, mapDispatchToProps)(TradeCardModal)