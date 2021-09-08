import style from '../../../assets/css/buy-card-modal.module.css'
import CardModal from './CardModal'
import {connect} from 'react-redux'
import { setShowModal } from '../../../redux/actions/modal'
import modalTypes from '../../../utility/modalTypes'
import { buySite } from '../../../redux/actions/site'
import { setActivePlayer, debitPlayerMoney } from '../../../redux/actions/player'
const BuyCardModal = ({card, setShowModal, buySite, activePlayer, sites, setActivePlayer, debitPlayerMoney}) => {
    const onBuy = () => {
        debitPlayerMoney(activePlayer, sites[card].sellingPrice)
        buySite(activePlayer, sites[card])
        setShowModal(false, null)
        setActivePlayer()

    }
    const onAuction = () => {
        setShowModal(true, modalTypes.AUCTION_CARD)
    }
    return (
        <div>
            <CardModal card={sites[card]}/>
            <div className={style.btnContainer}>
                <button className={`${style.btn} ${style.buy}`} onClick={onBuy}>Buy</button>
                <button className={`${style.btn} ${style.auction}`} onClick={onAuction}>Auction</button>
            </div>
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        activePlayer: store.playersData.activePlayer,
        sites:  store.siteData.sites
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        setShowModal: (showModal, currentModal) =>  dispatch(setShowModal(showModal, currentModal)),
        buySite: (playerId, siteData) =>  dispatch(buySite(playerId, siteData)),
        setActivePlayer: () =>  dispatch(setActivePlayer()),
        debitPlayerMoney: (playerId, amount) =>  dispatch(debitPlayerMoney(playerId, amount)),

    }
}

export default connect(mapStateToProps, mapDispatchToProps)(BuyCardModal) 