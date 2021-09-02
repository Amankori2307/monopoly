import style from '../../../assets/css/buy-card-modal.module.css'
import CardModal from './CardModal'
import {connect} from 'react-redux'
import { setShowModal } from '../../../redux/actions/modal'
import modalTypes from '../../../utility/modalTypes'
import { buySite } from '../../../redux/actions/site'
import { setActivePlayer } from '../../../redux/actions/player'
const BuyCardModal = ({card, setShowModal, buySite, activePlayer, sites, setActivePlayer}) => {
    const onBuy = () => {
        console.log(activePlayer)
        console.log(sites[card])
        buySite(activePlayer, sites[card])
        setShowModal(false, null)
        setActivePlayer()
    }
    const onAuction = () => {
        setShowModal(true, modalTypes.AUCTION_CARD)
    }
    console.log(card)
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
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(BuyCardModal) 