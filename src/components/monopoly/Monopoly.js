import React from 'react';
import { connect } from 'react-redux';
import {setShowModal} from '../../redux/actions/card'
import CardModal from "./modal/CardModal";
import ModalContainer from "./modal/ModalCotainer";
import Board from './board/Board';
import style from '../../assets/css/monopoly.module.css'
import backgroundImage from '../../assets/images/bg1.jpg'

const Monopoly = ({showModal, setShowModal}) => {
    return (
        <div style={style.monopoly} style={{backgroundImage: `url(${backgroundImage})`}}>
            <Board />
            {showModal && <ModalContainer setShow={setShowModal} component={CardModal}/>}
        </div>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {
        setShowModal: (payload) => dispatch(setShowModal(payload))   
    }
}

const mapStateToProps = (store) => {
    return {
        showModal: store.card.showModal
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Monopoly)