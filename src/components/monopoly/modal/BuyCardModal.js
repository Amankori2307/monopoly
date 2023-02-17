import style from '../../../assets/css/buy-card-modal.module.scss'
import CardModal from './CardModal'
import { connect } from 'react-redux'
import { setShowModal } from '../../../redux/actions/modal'
import { modalTypes } from '../../../utility/constants'
import { buySite } from '../../../redux/actions/site'
import { debitPlayerMoney } from '../../../redux/actions/player'
import { setIsDone } from '../../../redux/actions/board'
const BuyCardModal = ({ card, setShowModal, buySite, activePlayer, sites, debitPlayerMoney, setIsDone }) => {
    const onBuy = () => {
        debitPlayerMoney(activePlayer, sites[card].sellingPrice)
        buySite(activePlayer, sites[card])
        setShowModal(false, null)
        setIsDone(true)

    }
    const onAuction = () => {
        setShowModal(true, modalTypes.AUCTION_CARD)
    }
    return (
        <div>
            <CardModal card={sites[card]} />
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
        sites: store.siteData.sites
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
        buySite: (playerId, siteData) => dispatch(buySite(playerId, siteData)),
        debitPlayerMoney: (playerId, amount) => dispatch(debitPlayerMoney(playerId, amount)),
        setIsDone: (isDone) => dispatch(setIsDone(isDone)),

    }
}

export default connect(mapStateToProps, mapDispatchToProps)(BuyCardModal)