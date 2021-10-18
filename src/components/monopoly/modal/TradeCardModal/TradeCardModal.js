import {useEffect, useState} from 'react'
import { connect } from 'react-redux';
import { cardTypes } from '../../../../utility/constants';
import CardList from './CardList';
import style from '../../../../assets/css/trade-card-modal.module.css'
import { genCardList } from '../../../../utility/tradeCardModalUtils';

const TradeCardModal = ({siteData, totalPlayers, activePlayer}) => {
    const [cardLists, setCardLists] = useState({
        currentPlayer: [],
        otherPlayer: [],
    })
    const [playersDropdown, setPlayersDropdown] = useState([])
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


    return (
        <div className={style.tradeCardModal}>
            <div>
                <select name="cars" id="cars">
                    {playersDropdown.map(playerId => <option key={playerId}>Player{playerId}</option>)}
                </select>
            </div>
            <div className={style.cardListsContainer}>
                <CardList cardList={cardLists["currentPlayer"]} listName={"currentPlayer"}/>            
                <CardList cardList={cardLists["otherPlayer"]} listName={"otherPlayer"}/>            
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