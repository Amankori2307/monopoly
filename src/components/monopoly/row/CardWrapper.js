import style from '../../../assets/css/card.module.css'
import {connect} from 'react-redux'
import {setCurrentCard} from '../../../redux/actions/card'
import {setShowModal} from '../../../redux/actions/modal'
import {cardTypes} from '../../../utility/constants'
import modalTypes from '../../../utility/modalTypes'
import colors from '../../../utility/colors'
import mortgagedIcon  from '../../../assets/images/mortgaged.svg'
import { useCallback, useEffect, useState } from 'react'
import actionTypes from '../../../utility/actionTypes'
import { mortgageSite, redeemSite, buildOnSite, sellBuild } from '../../../redux/actions/site'
import {creditPlayerMoney, debitPlayerMoney} from '../../../redux/actions/player'
import HouseAndHotel from './HouseAndHotel'
import startBG from '../../../assets/images/start.png'
import jailBG from '../../../assets/images/jail.png'
import resortBG from '../../../assets/images/resort.png'
import goToJailBG from '../../../assets/images/go-to-jail.png'

const SpecialCardBG = {
    1: startBG,
    2: jailBG,
    3: resortBG,
    4: goToJailBG
}

const CardWrapper = ({data, rowNum, setShowModal, setCurrentCard, soldTo, actionData, playersSites, activePlayer, mortgageSite, redeemSite, creditPlayerMoney, debitPlayerMoney, noOfCardsInCategory, buildOnSite, sellBuild}) => {
    const [isActionable, setIsActionable] = useState(false)
    const isBuildable =  useCallback((mySites, currentCard) => {
        let _isActionable = false;
        if(currentCard.type === cardTypes.SITE){ 
            let subType = currentCard.subType;
            let mySitesInGivenCategory = mySites.filter(item => item.subType === subType)
            if(mySitesInGivenCategory.length === noOfCardsInCategory[subType]){ // checking is all the sites of this subType belongs to the current user 
                let i = 0;
                for(; i<mySitesInGivenCategory.length; i++){ // checking if any site is mortgaged
                    if(mySitesInGivenCategory[i].isMortgaged) break;
                    if(currentCard.built > mySitesInGivenCategory[i].built) break;
                    if(currentCard.built === 5) break;
                }
                if(i === noOfCardsInCategory[subType]) _isActionable = true;
            }
        }
        return _isActionable;
    }, [noOfCardsInCategory])

    const isSellable =  useCallback((mySites, currentCard) => {
        let _isActionable = false;
        if(currentCard.built){ // Check if any construction on the current site/card 
            let subType = currentCard.subType;
            let mySitesInGivenCategory = mySites.filter(item => item.subType === subType)
            let i = 0;
            for(; i<mySitesInGivenCategory.length; i++){ // checking if any site is mortgaged
                if(currentCard.built < mySitesInGivenCategory[i].built) break;
            }
            if(i === noOfCardsInCategory[subType]) _isActionable = true;
        }
        return _isActionable;
    }, [noOfCardsInCategory])

    const getIsActionable = useCallback(() => {
        let card = playersSites[activePlayer].filter(item => item.id===data.id)

        switch(actionData.currentAction){
            case actionTypes.MORTGAGE:
                return card.length?!card[0].isMortgaged:false;
            case actionTypes.REDEEM:
                return card.length?card[0].isMortgaged:false;
            case actionTypes.BUILD:
                return isBuildable(playersSites[activePlayer], data);
            case actionTypes.SELL:
                return isSellable(playersSites[activePlayer], data);
            default:
                return false; 
        }
    },[activePlayer, data, playersSites, actionData.currentAction, isBuildable, isSellable])

    useEffect(() => {
        let _isActionable = getIsActionable();
        setIsActionable(_isActionable)
    },[getIsActionable])

    const genClassList = () => {
        let classList = "";
        if([cardTypes.SITE, cardTypes.REALM_RAILS, cardTypes.UTILITY].includes(data.type)){
            classList += style.card+" "
            classList += rowNum === 1 || rowNum ===2? style.reverse+" ": ""
            classList += (rowNum === 1 || rowNum ===2) && (soldTo != null)? `${style.sold} ${style.soldRev} ${style[colors[soldTo]]} `: ""
            classList += (rowNum === 3 || rowNum ===4) && (soldTo != null)? `${style.sold} ${style[colors[soldTo]]} `: ""
        }
        else if(data.type === cardTypes.SPECIAL){
            classList +=  style.specialCard+" " 
            classList += rowNum === 1 || rowNum === 2? style.reverseSpecialCard+" ": ""
        }
        else if([cardTypes.CHEST, cardTypes.CHANCE]){
            classList += style.card+" "+style.chest+" "
        }
        classList += actionData.active && !isActionable ?style.inactive+" ":""

        return classList
    }

    const onCardClick = () => {
        if(actionData.active && isActionable){
            switch(actionData.currentAction){
                case actionTypes.MORTGAGE:
                    mortgageCard();
                    break;
                case actionTypes.REDEEM:
                    redeemCard();
                    break;
                case actionTypes.BUILD:
                    build();
                    break;
                case actionTypes.SELL:
                    sell();
                    break;
                default:
                    console.log("Invalid Action")

            }
        }else if(!actionData.active){ //
            showCardModal()
        }
    }
    
    const showCardModal = () => {
        setShowModal(true, modalTypes.SHOW_CARD)
        setCurrentCard(data)
    }
    
    const mortgageCard = () => {
        mortgageSite(data.id, activePlayer)
        creditPlayerMoney(activePlayer, (data.sellingPrice*50)/100)
    }
    const redeemCard = () => {
        redeemSite(data.id, activePlayer)
        debitPlayerMoney(activePlayer, (data.sellingPrice*55)/100)
    }
    const build = () => {
        buildOnSite(data.id, activePlayer)
        debitPlayerMoney(activePlayer, data.construction)
    }
    const sell = () => {
        sellBuild (data.id, activePlayer)
        creditPlayerMoney(activePlayer, data.construction/2)
    }
    const genCard = () => {
        let UI = null;
        switch(data.type){
            case cardTypes.SITE:
            case cardTypes.REALM_RAILS:
            case cardTypes.UTILITY:
                UI = (
                    <div className={genClassList()} onClick={onCardClick}>
                        <div className={`${style.strip} ${data.color}`}>
                            <HouseAndHotel built={data.built?data.built:0} odd={rowNum%2!==0}/>
                        </div>
                        <div className={style.details}>
                            <p className={style.sellingPrice}>${data.sellingPrice}</p>
                            <p className={style.name}>{data.name}</p>
                        </div>
                        {data.isMortgaged && <img className={style.mortgaged} src={mortgagedIcon} alt="mortgaged"/>}
                    </div>
                );
                break;
            case cardTypes.SPECIAL:
                UI = (
                    <div className={genClassList()} style={{backgroundImage: `url(${SpecialCardBG[rowNum]})`}}>
                    </div>
                );
                break;
            case cardTypes.CHEST:
            case cardTypes.CHANCE:
                UI = (
                    <div className={genClassList()}>
                        
                        <p>{data.name}</p>
                    </div>
                );
                break;
            case cardTypes.TAX:
                UI = (
                    <div className={`${style.card} ${genClassList()}`} onClick={onCardClick}>
                        <div className={style.details}>
                            <p className={style.debit}>Pay ${data.debit}</p>
                            <p className={style.name}>{data.name}</p>
                        </div>
                    </div>
                );
                break;
            default:
                UI = null
                break;
        }
        return UI        
    }

    return (
        <>
            {genCard()}
        </>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
        setCurrentCard: (cardData) => dispatch(setCurrentCard(cardData)),
        mortgageSite: (siteId, playerId) => dispatch(mortgageSite(siteId, playerId)),
        redeemSite: (siteId, playerId) => dispatch(redeemSite(siteId, playerId)),
        buildOnSite: (siteId, playerId) => dispatch(buildOnSite(siteId, playerId)),
        sellBuild: (siteId, playerId) => dispatch(sellBuild(siteId, playerId)),
        creditPlayerMoney: (playerId, amount) => dispatch(creditPlayerMoney(playerId, amount)),
        debitPlayerMoney: (playerId, amount) => dispatch(debitPlayerMoney(playerId, amount)),
    }
}
const mapStateToProps = (store) => {
    return {
        actionData: store.actionData,
        playersSites: store.siteData.playersSites,
        activePlayer: store.playersData.activePlayer,
        noOfCardsInCategory: store.siteData.noOfCardsInCategory,
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(CardWrapper) 
