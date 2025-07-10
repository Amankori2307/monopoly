import { connect } from 'react-redux'
import { setCurrentCard } from '../../../redux/actions/card'
import { setShowModal } from '../../../redux/actions/modal'
import { actionTypes, modalTypes } from '../../../utility/constants'
import { useCallback, useEffect, useState } from 'react'
import { mortgageSite, redeemSite, buildOnSite, sellBuild } from '../../../redux/actions/site'
import { creditPlayerMoney, debitPlayerMoney } from '../../../redux/actions/player'
import Card from './Card/Card'
import { isBuildable, isSellable } from '../../../utility/cardUtilities' 

const CardWrapper = ({ data, rowNum, setShowModal, setCurrentCard, boughtBy, actionData, playersSites, activePlayer, mortgageSite, redeemSite, creditPlayerMoney, debitPlayerMoney, noOfCardsInCategory, buildOnSite, sellBuild }) => {
    const [isActionable, setIsActionable] = useState(false)
  
    const getIsActionable = useCallback(() => {
        let card = playersSites[activePlayer].filter(item => item.id === data.id)

        switch (actionData.currentAction) {
            case null:
                return true;
            case actionTypes.MORTGAGE:
                return card.length ? !card[0].isMortgaged : false;
            case actionTypes.REDEEM:
                return card.length ? card[0].isMortgaged : false;
            case actionTypes.BUILD:
                return isBuildable(playersSites[activePlayer], data, noOfCardsInCategory);
            case actionTypes.SELL:
                return isSellable(playersSites[activePlayer], data, noOfCardsInCategory);
            default:
                return false;
        }
    }, [activePlayer, data, playersSites, actionData.currentAction, noOfCardsInCategory])

    const onCardClick = () => {
        if (actionData.active && isActionable) {
            switch (actionData.currentAction) {
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
        } else if (!actionData.active) { //
            showCardModal()
        }
    }

    const showCardModal = () => {
        setShowModal(true, modalTypes.SHOW_CARD)
        setCurrentCard(data)
    }

    const mortgageCard = () => {
        mortgageSite(data.id, activePlayer)
        creditPlayerMoney(activePlayer, (data.sellingPrice * 50) / 100)
    }

    const redeemCard = () => {
        redeemSite(data.id, activePlayer)
        debitPlayerMoney(activePlayer, (data.sellingPrice * 55) / 100)
    }

    const build = () => {
        buildOnSite(data.id, activePlayer)
        debitPlayerMoney(activePlayer, data.construction)
    }

    const sell = () => {
        sellBuild(data.id, activePlayer)
        creditPlayerMoney(activePlayer, data.construction / 2)
    }

    useEffect(() => {
        let _isActionable = getIsActionable();
        setIsActionable(_isActionable)
    }, [getIsActionable])

    return <Card  onCardClick={onCardClick} data={data} rowNum={rowNum} active={isActionable} boughtBy={boughtBy}/>
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
