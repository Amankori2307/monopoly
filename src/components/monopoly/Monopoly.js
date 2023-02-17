import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import style from '../../assets/css/monopoly.module.scss';
import sites from '../../assets/data/boardData.json';
import { calculateSitePositions, setBoardSize } from '../../redux/actions/board';
import { setTotalPlayers } from '../../redux/actions/player';
import { setSites } from '../../redux/actions/site';
import { modalTypes } from '../../utility/constants';
import Footer from '../home/footer/Footer';
import Header from '../home/header/Header';
import Board from './board/Board';
import AuctionCardModal from './modal/AuctionCardModal';
import BuyCardModal from './modal/BuyCardModal';
import CardModal from "./modal/CardModal";
import ModalContainer from "./modal/ModalCotainer";
import MyCards from './modal/MyCards';

const Monopoly = ({ modalData, currentCard, playersData, setBoardSize, calculateSitePositions, setTotalPlayers, setSites }) => {
    const totalPlayers = 2;
    const isMounted = useRef(false)
    useEffect(() => {
        let w = window.innerWidth;
        let h = window.innerHeight;
        let boardSize = Math.min(w, h)
        const margin = boardSize > 600 ? 100 : 40;
        let boardData = {
            side: boardSize - margin,
            rowWidth: 120
        }
        setBoardSize(boardData)
        calculateSitePositions(boardData)
        setTotalPlayers(totalPlayers)
        setSites([...sites])
        isMounted.current = true
    }, [setBoardSize, calculateSitePositions, setTotalPlayers, setSites])

    return (
        <>
            {isMounted.current &&
                <div className={style.monopoly} >
                    <Header />
                    <Board />
                    {modalData.showModal && <>
                        {modalData.currentModal === modalTypes.SHOW_CARD && <ModalContainer component={CardModal} card={currentCard} />}
                        {modalData.currentModal === modalTypes.BUY_CARD && <ModalContainer component={BuyCardModal} card={playersData.players[playersData.activePlayer].site} disableHideOnOuterClick={true} />}
                        {modalData.currentModal === modalTypes.AUCTION_CARD && <ModalContainer component={AuctionCardModal} card={playersData.players[playersData.activePlayer].site} disableHideOnOuterClick={true} />}
                        {modalData.currentModal === modalTypes.MY_CARDS && <ModalContainer component={MyCards} title={"My Cards"} />}
                    </>
                    }
                    <Footer />
                </div>
            }
        </>
    );
}

const mapDispatchToProps = (dispatch) => {
    return {
        setBoardSize: data => dispatch(setBoardSize(data)),
        calculateSitePositions: data => dispatch(calculateSitePositions(data)),
        setTotalPlayers: totalPlayers => dispatch(setTotalPlayers(totalPlayers)),
        setSites: data => dispatch(setSites(data)),
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