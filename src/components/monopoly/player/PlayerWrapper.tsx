import Player from './Player';

interface PlayerWrapperPropsType {
  currentPlayerId: number;
  color: string;
}
const PlayerWrapper = (props: PlayerWrapperPropsType) => {
  const { currentPlayerId, color } = props;
  return <Player currentPlayerId={currentPlayerId} color={color} />;
};

export default PlayerWrapper;
