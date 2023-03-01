import { colorsMapping } from 'lib/core/src/lib';
import PlayerWrapper from './PlayerWrapper';

interface PlayerContainerPropsType {
  totalPlayers: number;
}

const PlayerContainer = (props: PlayerContainerPropsType) => {
  const { totalPlayers } = props;
  return (
    <div className="playerContainer">
      {Array(totalPlayers)
        .fill(0)
        .map((data, idx: number) => (
          <PlayerWrapper
            key={idx}
            currentPlayerId={idx}
            color={colorsMapping[idx]}
          />
        ))}
    </div>
  );
};
export default PlayerContainer;
