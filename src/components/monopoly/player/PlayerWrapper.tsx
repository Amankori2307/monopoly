import Player from './Player';

interface PlayerWrapperPropsType {
  playerId: number;
  color: string;
}
const PlayerWrapper = (props: PlayerWrapperPropsType) => {
  const { playerId, color } = props;
  return <Player playerId={playerId} color={color} />;
};

export default PlayerWrapper;
