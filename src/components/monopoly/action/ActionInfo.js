import { connect } from 'react-redux';
import { setAction } from '../../../redux/actions/action'
import style from '../../../assets/css/action-info.module.scss'
const ActionInfo = ({ setAction, actionData }) => {
    const onClose = () => {
        setAction(false, null)
    }
    return (

        <div className={style.actionInfo}>
            <div className={style.header}>
                <p className={style.title}>{actionData.currentAction}</p>
            </div>
            <div className={style.main}>
                <p>To {actionData.currentAction}, tap on the highlighted card.</p>
                <button className={style.close} onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        actionData: store.actionData
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        setAction: (active, currentAction) => dispatch(setAction(active, currentAction))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ActionInfo)