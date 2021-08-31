import React from 'react';
import { connect } from 'react-redux';
import {setShowModal} from '../../redux/actions/card'
import CardModal from "./modal/CardModal";
import ModalContainer from "./modal/ModalCotainer";
import Board from './board/Board';

const Monopoly = ({showModal, setShowModal}) => {
    return (
        <>
            <Board />
            {showModal && <ModalContainer setShow={setShowModal} component={CardModal}/>}
        </>
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