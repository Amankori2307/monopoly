import { setIsDone } from '@monopoly/lib//core'
import { connect, useDispatch } from 'react-redux'
import style from '../../../assets/css/buy-card-modal.module.scss'
import { setShowModal } from '../../../redux/actions/modal'
import { debitPlayerMoney } from '../../../redux/actions/player'
import { buySite } from '../../../redux/actions/site'
import { modalTypes } from '../../../utility/constants'
import CardModal from './CardModal'
const BuyCardModal = ({ card, setShowModal, buySite, activePlayer, sites, debitPlayerMoney }) => {
    const dispatch = useDispatch();
    const onBuy = () => {
        debitPlayerMoney(activePlayer, sites[card].sellingPrice)
        buySite(activePlayer, sites[card])
        setShowModal(false, null)
        dispatch(setIsDone(true))

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

    }
}

export default connect(mapStateToProps, mapDispatchToProps)(BuyCardModal)