import useAppSelector from 'src/hooks/redux/use-app-selector';
import style from '../../../assets/css/player-details.module.scss';
import PlayerDetails from './PlayerDetails';

const PlayerDetailsContainer = () => {
  const totalPlayers = useAppSelector(
    (store) => store.playersData.totalPlayers
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
