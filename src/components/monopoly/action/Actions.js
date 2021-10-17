import { connect } from 'react-redux'
import style from '../../../assets/css/actions.module.css'
import {setAction} from '../../../redux/actions/action'
import {actionTypes, modalTypes} from '../../../utility/constants'
import {setShowModal} from '../../../redux/actions/modal'

const Actions = ({setAction, active: disabled, setShowModal}) => {
    const setActionHelper = (e) => {
        let el = e.target
        let actionType = el.getAttribute("action-type")
        setAction(true, actionType)
    }
    const tradeCard = () => {
        setShowModal(true, modalTypes.TRADE)
    }
    return (
        <div className={style.actions}>
            <button disabled={disabled} className={`${style.build} ${style.btn} `} onClick={setActionHelper} action-type={actionTypes.BUILD}>Build</button>
            <button disabled={disabled} className={`${style.sell} ${style.btn}`} onClick={setActionHelper} action-type={actionTypes.SELL}>Sell</button>
            <button disabled={disabled} className={`${style.mortgage} ${style.btn}`} onClick={setActionHelper} action-type={actionTypes.MORTGAGE}>Mortgage</button>
            <button disabled={disabled} className={`${style.redeem} ${style.btn}`} onClick={setActionHelper} action-type={actionTypes.REDEEM}>Redeem</button>
            <button disabled={disabled} className={`${style.trade} ${style.btn}`} onClick={tradeCard}>Trade</button>
        </div>
    )
}

const mapDispatchToProps = (dispatch) => {
    return {
        setAction: (active, currentAction) => dispatch(setAction(active, currentAction)),
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
    }
}

const mapStateToProps = (store) => {
    return {
        active: store.actionData.active
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Actions) 