import { useRef } from 'react';
import style from '../../../assets/css/player.module.scss';

interface PlayerPropsType {
  playerId: number;
  color: string;
}

function Player(props: PlayerPropsType) {
  const { playerId, color } = props;
  const playerRef = useRef(null);

  return (
    <div className={`${style.player} player-${color}`} ref={playerRef}>
      {playerId}
    </div>
  );
}

export default Player;
