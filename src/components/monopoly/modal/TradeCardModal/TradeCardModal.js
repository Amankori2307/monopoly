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
    const [askOrSendMoney, setAskOrSendMoney] = useState({
        ask: 0,
        send: 0,
    })
    useEffect(() => {
        let sites = siteData.sites.filter(site => site.type === cardTypes.SITE || site.type === cardTypes.REALM_RAILS || site.type === cardTypes.UTILITY )
        let currentPlayerCardList, otherPlayerCardList;
        currentPlayerCardList = genCardList(sites.slice(0,5))
        otherPlayerCardList = genCardList(sites.slice(5,10))
        setCardLists({
            "currentPlayer": currentPlayerCardList,
            "otherPlayer": otherPlayerCardList
        })
        setPlayersDropdown(Array.from(Array(totalPlayers).keys()).filter(playerID => playerID!==activePlayer))
    }, [siteData.sites, activePlayer, totalPlayers])

    const onSelect = (id, listName) => {
        console.log(id, listName)
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
        setAskOrSendMoney({
            ...askOrSendMoney,
            [type]: value
        })
    }
    return (
        <div className={`${style.tradeCardModal} ${style.row}`}>
            <div className={`${style.cardLists} ${style.row}`}>
                <CardList cardList={cardLists["currentPlayer"]} listName={"currentPlayer"} onSelect={onSelect} selectedCards={noOfSelectedCards.currentPlayer}/>            
                <CardList cardList={cardLists["otherPlayer"]} listName={"otherPlayer"}  onSelect={onSelect} selectedCards={noOfSelectedCards.otherPlayer}/>            
            </div>
            <div className={style.controls}>
                <select name="cars" id="cars" className={style.playerDropdown}>
                    {playersDropdown.map(playerId => <option key={playerId}>Player{playerId}</option>)}
                </select>
                <PlayerMoneyAndInput />
                <PlayerMoneyAndInput />
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