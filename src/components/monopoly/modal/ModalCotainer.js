import style from '../../../assets/css/modal.module.css'
import { connect } from 'react-redux'
import { setShowModal } from '../../../redux/actions/modal'

const ModalContainer = ({ component: Component, setShowModal, disableHideOnOuterClick, title, ...rest }) => {
    const hideOnClick = e => {
        setShowModal(false, null)
    }
    const preventModalCloseOnClick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
    }
    return (
        <div className={style.modalContainer} onClick={() => disableHideOnOuterClick ? "" : hideOnClick()}>
            <div className={style.cardModal} onClick={preventModalCloseOnClick}>
                {!disableHideOnOuterClick &&
                    <div className={style.closeStrip} >
                        <span className={style.title}>{title}</span>
                        <i className={`fas fa-times ${style.close}`} onClick={hideOnClick}></i>
                    </div>
                }

                <div className={style.cardContent}>

                    <Component hideOnClick={hideOnClick} onClick={preventModalCloseOnClick} {...rest} />
                </div>
            </div>
        </div>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal))
    }
}

export default connect(null, mapDispatchToProps)(ModalContainer)