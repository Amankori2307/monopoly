import React from 'react';
import { connect } from 'react-redux';
import CardModal from "./modal/CardModal";
import ModalContainer from "./modal/ModalCotainer";
import Board from './board/Board';
import style from '../../assets/css/monopoly.module.css'
import Header from '../home/header/Header';
import Footer from '../home/footer/Footer';
import BuyCardModal from './modal/BuyCardModal';
import modalTypes from '../../utility/modalTypes';

const Monopoly = ({modalData, currentCard, playersData}) => {
    return (
        <div className={style.monopoly} >
            <Header />
            <Board />
            {modalData.showModal && <>
                {modalData.currentModal === modalTypes.SHOW_CARD && <ModalContainer component={CardModal} card={currentCard}/>}
                {modalData.currentModal === modalTypes.BUY_CARD && <ModalContainer  component={BuyCardModal} card={playersData.players[playersData.activePlayer].site} disableHideOnOuterClick={true}/>}
                
            </>
            }
            <Footer />
        </div>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {
    }
}

const mapStateToProps = (store) => {
    return {
        modalData: store.modalData,
        currentCard: store.card.currentCard,
        playersData: store.playersData

    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Monopoly)