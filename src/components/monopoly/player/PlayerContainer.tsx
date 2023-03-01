import { colorsMapping } from 'lib/core/src/lib';
import PlayerWrapper from './PlayerWrapper';

interface PlayerContainerPropsType {
  totalPlayers: number;
}

const PlayerContainer = (props: PlayerContainerPropsType) => {
  const { totalPlayers } = props;
  return (
    <div className="playerContainer">
      {Array.from(Array(totalPlayers).keys()).map((playerId: number) => (
        <PlayerWrapper
          key={playerId}
          playerId={playerId}
          color={colorsMapping[playerId]}
        />
      ))}
    </div>
  );
};
export default PlayerContainer;
