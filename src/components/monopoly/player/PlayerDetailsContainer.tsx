import { useSelector } from 'react-redux';
import { IState } from 'src/redux/reducers/rootReducer';
import style from '../../../assets/css/player-details.module.scss';
import PlayerDetails from './PlayerDetails';

const PlayerDetailsContainer = () => {
  const totalPlayers = useSelector(
    (store: IState) => store.playersData.totalPlayers
  );
  return (
    <div className={style.playerDetailsContainer}>
      {Array.from(Array(totalPlayers).keys()).map((id) => (
        <PlayerDetails key={id} playerId={id} />
      ))}
    </div>
  );
};

export default PlayerDetailsContainer;
