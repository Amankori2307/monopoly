import { connect } from 'react-redux';
import style from '../../../assets/css/player-details.module.scss'
import { setShowModal, setPlayerIdForMyCardsModal } from '../../../redux/actions/modal'
import { modalTypes, colors } from '../../../utility/constants';
const PlayerDetails = ({ playersData, playerId, setShowModal, setPlayerIdForMyCardsModal }) => {
    const player = playersData.players[playerId]
    const active = (playersData.activePlayer === playerId)
    const color = colors[playerId]
    const viewMyCards = () => {
        setShowModal(true, modalTypes.MY_CARDS)
        setPlayerIdForMyCardsModal(player.playerId)
    }

    return (
        <div className={`${style.playerDetails} ${style[color]} ${active ? style.active : ""}`}>
            <div className={style.header}>
                <p className={style.playerName}>Player {player.playerId}</p>
                <div className={style.overley}></div>
            </div>
            <div className={style.details}>
                <p className={style.playerMoney}><b>Money:</b> ${player.money}</p>
                <button className={style.viewMyCards} onClick={viewMyCards} >Views My Cards</button>
            </div>
        </div>
    );
}
const mapStateToProps = (store) => {
    return {
        playersData: store.playersData,
        // activePlayer: store.playersData.activePlayer
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        setShowModal: (showModal, currentModal) => dispatch(setShowModal(showModal, currentModal)),
        setPlayerIdForMyCardsModal: (playerId) => dispatch(setPlayerIdForMyCardsModal(playerId)),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(PlayerDetails)