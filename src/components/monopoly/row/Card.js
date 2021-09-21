import style from '../../../assets/css/card.module.css'
import {connect} from 'react-redux'
import {setCurrentCard} from '../../../redux/actions/card'
import {setShowModal} from '../../../redux/actions/modal'
import {REALM_RAILS, SITE, UTILITY, CHANCE, CHEST, TAX, SPECIAL} from '../../../utility/constants'
import modalTypes from '../../../utility/modalTypes'
import colors from '../../../utility/colors'
import mortgagedIcon  from '../../../assets/images/mortgaged.svg'
import { useCallback, useEffect, useState } from 'react'
import actionTypes from '../../../utility/actionTypes'
import { mortgageSite } from '../../../redux/actions/site'
import {creditPlayerMoney} from '../../../redux/actions/player'

const Card = ({data, rowNum, setShowModal, setCurrentCard, soldTo, actionData, playersSites, activePlayer, mortgageSite, creditPlayerMoney}) => {
    const [isMortgageable, setIsMortgageable] = useState(false)
    const [isCardActive, setIsCardActive] = useState(false)
    const getIsMortgageable = useCallback(() => {
        let card = playersSites[activePlayer].filter(item => item.id===data.id)
        return card.length?!card[0].isMortgaged:false; 
    },[activePlayer, data.id, playersSites])
    useEffect(() => {
        let _isMortgageable;
        switch(actionData.currentAction){
            case actionTypes.MORTGAGE:
                _isMortgageable = getIsMortgageable()
                console.log("Mortgage")
                break;
            default:
                console.log("nothing")
        }
        setIsMortgageable(_isMortgageable)
        setIsCardActive(_isMortgageable)
    },[getIsMortgageable, actionData.currentAction])

    const genClassList = () => {
        let classList = "";
        if([SITE, REALM_RAILS, UTILITY].includes(data.type)){
            classList += style.card+" "
            classList += rowNum === 1 || rowNum ===2? style.reverse+" ": ""
            classList += (rowNum === 1 || rowNum ===2) && (soldTo != null)? `${style.sold} ${style.soldRev} ${style[colors[soldTo]]} `: ""
            classList += (rowNum === 3 || rowNum ===4) && (soldTo != null)? `${style.sold} ${style[colors[soldTo]]} `: ""
        }
        else if(data.type === SPECIAL){
            classList +=  style.specialCard+" " 
            classList += rowNum === 1 || rowNum === 2? style.reverseSpecialCard+" ": ""
        }
        else if([CHEST, CHANCE]){
            classList += style.card+" "+style.chest+" "
        }
        classList += actionData.active && !isMortgageable ?style.inactive+" ":""

        return classList
    }

    const onCardClick = () => {
        if(actionData.active && isCardActive){
            if(actionData.currentAction === actionTypes.MORTGAGE){
                mortgageCard()

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
        creditPlayerMoney(activePlayer, data.sellingPrice/2)
    }
    const genCard = () => {
        let UI = null;
        switch(data.type){
            case SITE:
            case REALM_RAILS:
            case UTILITY:
                UI = (
                    <div className={genClassList()} onClick={onCardClick}>
                        <div className={`${style.strip} ${data.color}`}></div>
                        <div className={style.details}>
                            <p className={style.sellingPrice}>${data.sellingPrice}</p>
                            <p className={style.name}>{data.name}</p>
                        </div>
                        {data.isMortgaged && <img className={style.mortgaged} src={mortgagedIcon} alt="mortgaged"/>}
                    </div>
                );
                break;
            case SPECIAL:
                UI = (
                    <div className={genClassList()}>
                        <p>{data.name}</p>
                    </div>
                );
                break;
            case CHEST:
            case CHANCE:
                UI = (
                    <div className={genClassList()}>
                        
                        <p>{data.name}</p>
                    </div>
                );
                break;
            case TAX:
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
        creditPlayerMoney: (playerId, amount) => dispatch(creditPlayerMoney(playerId, amount)),
    }
}
const mapStateToProps = (store) => {
    return {
        actionData: store.actionData,
        playersSites: store.siteData.playersSites,
        activePlayer: store.playersData.activePlayer,
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Card) 
