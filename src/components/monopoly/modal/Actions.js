import { connect } from 'react-redux'
import style from '../../../assets/css/actions.module.scss'
import { setAction } from '../../../redux/actions/action'
import { actionTypes } from '../../../utility/constants'

const Actions = ({ setAction, active: disabled }) => {
    const setActionHelper = (e) => {
        let el = e.target
        let actionType = el.getAttribute("action-type")
        setAction(true, actionType)
    }
    return (
        <div className={style.actions}>
            <button disabled={disabled} className={`${style.build} ${style.btn} `} onClick={setActionHelper} action-type={actionTypes.BUILD}>Build</button>
            <button disabled={disabled} className={`${style.sell} ${style.btn}`} onClick={setActionHelper} action-type={actionTypes.SELL}>Sell</button>
            <button disabled={disabled} className={`${style.mortgage} ${style.btn}`} onClick={setActionHelper} action-type={actionTypes.MORTGAGE}>Mortgage</button>
            <button disabled={disabled} className={`${style.redeem} ${style.btn}`} onClick={setActionHelper} action-type={actionTypes.REDEEM}>Redeem</button>
        </div>
    )
}

const mapDispatchToProps = (dispatch) => {
    return {
        setAction: (active, currentAction) => dispatch(setAction(active, currentAction))
    }
}

const mapStateToProps = (store) => {
    return {
        active: store.actionData.active
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Actions) 