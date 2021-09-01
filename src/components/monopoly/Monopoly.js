import React from 'react';
import { connect } from 'react-redux';
import {setShowModal} from '../../redux/actions/card'
import CardModal from "./modal/CardModal";
import ModalContainer from "./modal/ModalCotainer";
import Board from './board/Board';
import style from '../../assets/css/monopoly.module.css'
import Header from '../home/header/Header';
import Footer from '../home/footer/Footer';

const Monopoly = ({showModal, setShowModal}) => {
  
    return (
        <div className={style.monopoly} >
            <Header />
            <Board />
            {showModal && <ModalContainer setShow={setShowModal} component={CardModal}/>}
            <Footer />
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