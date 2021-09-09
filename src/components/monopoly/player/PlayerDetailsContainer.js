import style from '../../../assets/css/player-details.module.css'
import PlayerDetails from './PlayerDetails';
import { connect } from 'react-redux';
import colors from '../../../utility/colors';

const PlayerDetailsContainer = ({players, activePlayer}) => {
    return (
        <div className={style.playerDetailsContainer}>
            { Object.values(players).map((player, index) => <PlayerDetails key={index} player={player} active={activePlayer===player.playerId?true:false} color={colors[player.playerId]}/>)}
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        players: store.playersData.players,
        activePlayer: store.playersData.activePlayer
    }
}

export default connect(mapStateToProps)(PlayerDetailsContainer)