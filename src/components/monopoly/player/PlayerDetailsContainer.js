import style from '../../../assets/css/player-details.module.scss'
import PlayerDetails from './PlayerDetails';
import { connect } from 'react-redux';

const PlayerDetailsContainer = ({ totalPlayers }) => {
    return (
        <div className={style.playerDetailsContainer}>
            {Array.from(Array(totalPlayers).keys()).map((id) => <PlayerDetails key={id} playerId={id} />)}
        </div>
    );
}

const mapStateToProps = (store) => {
    return {
        totalPlayers: store.playersData.totalPlayers,
    }
}

export default connect(mapStateToProps)(PlayerDetailsContainer)