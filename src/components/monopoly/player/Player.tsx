import { useRef } from 'react';
import style from '../../../assets/css/player.module.scss';

interface PlayerPropsType {
  currentPlayerId: number;
  color: string;
}

function Player(props: PlayerPropsType) {
  const { currentPlayerId, color } = props;
  const playerRef = useRef(null);

  return (
    <div className={`${style.player} player-${color}`} ref={playerRef}>
      {currentPlayerId}
    </div>
  );
}

export default Player;
