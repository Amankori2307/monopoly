import { colorsMapping } from 'lib/core/src/lib';
import Player from './Player';

const PlayerContainer = ({ totalPlayers }) => {
  return (
    <div className="playerContainer">
      {Array(totalPlayers)
        .fill(0)
        .map((data, idx: number) => (
          <Player key={idx} currentPlayerId={idx} color={colorsMapping[idx]} />
        ))}
    </div>
  );
};
export default PlayerContainer;
