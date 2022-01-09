import { connect } from "react-redux";
import CardModal from "../CardModal";
import style from "../../../../assets/css/trade-card-offer-modal.module.css"
import { setShowModal } from "../../../../redux/actions/modal";

const TradeCardOffer = ({tradeData, setShowModal}) => {
    const acceptOffer = () => {
        console.log("Offer Accepted")
    }

    const declineOffer = () => {
        console.log("Offer Declined")
        setShowModal(false, null)
    }
    return (
        <div className={style.tradeCardOfferModal}>
            <div className={style.cardListContainer}>
                <p className={style.cardListHeading}>Receiving</p>
                <div className={style.cardList}>
                    {tradeData.cardLists.recieving.map(card => <CardModal key={card.id} card={card}/>)}
                </div>
            </div>
            <div className={style.cardListContainer}>
                <p className={style.cardListHeading}>Sending</p>
                <div className={style.cardList}>
                    {tradeData.cardLists.sending.map(card => <CardModal key={card.id} card={card}/>)}
                </div>
            </div>
            <div className={style.tradeInfoContainer}>
                <p className={style.cardListHeading}>Trade Info</p>
                <div className={style.tradeInfo}>
                    <table>
                        <tbody>
                            <tr>
                                <th>From:</th>
                                <td>Player0</td>
                            </tr>
                            <tr>
                                <th>To:</th>
                                <td>Player1</td>
                            </tr>
                            <tr>
                                <th>Receiving Amount:</th>
                                <td>${tradeData.ask}</td>
                            </tr>
                            <tr>
                                <th>Sending Amount:</th>
                                <td>${tradeData.send}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className={`${style.btnContainer} ${style.row}`}>
                        <button className={`${style.btn} ${style.accept}`} onClick={acceptOffer}>Accept</button>
                        <button className={`${style.btn} ${style.decline}`} onClick={declineOffer}>Decline</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const mapStateToProps = store => {
    return {
        tradeData: store.tradeData
    }
}

const mapDispatchToProps = dispatch => {
    return {
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(TradeCardOffer)