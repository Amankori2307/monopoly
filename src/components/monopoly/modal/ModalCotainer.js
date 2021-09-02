import style from '../../../assets/css/modal.module.css'
import {connect} from 'react-redux'
import { setShowModal } from '../../../redux/actions/modal'

const ModalContainer = ({component: Component, setShowModal, ...rest}) => {
    const hideOnClick = e => {    
        setShowModal(false, null)
    }
    const preventModalCloseOnClick = (e) => {
        if(e && e.stopPropagation) e.stopPropagation(); 
    } 
    return (
        <div className={style.modalContainer} onClick={hideOnClick}>
            <div className={style.cardModal} onClick={preventModalCloseOnClick}>
                <div className={style.closeStrip} >
                    <i className={`fas fa-times ${style.close}`} onClick={hideOnClick}></i>
                </div>
                <div className={style.cardContent}>

                    <Component hideOnClick={hideOnClick} onClick={preventModalCloseOnClick} {...rest}/>
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