import { useMemo, useRef } from 'react';
import Player from './Player';
import audio1 from '../../../assets/audio/playermove.wav';
import useAppSelector from 'src/hooks/redux/use-app-selector';
import store from 'src/redux/store';

interface PlayerWrapperPropsType {
  playerId: number;
  color: string;
}
const PlayerWrapper = (props: PlayerWrapperPropsType) => {
  const { playerId: currentPlayerId, color } = props;


  const siteData = useAppSelector(store => store.siteData)
  const board = useAppSelector(store => store.board)
  const playersData = useAppSelector(store => store.playersData)
  const diceSum = useAppSelector(store => store.dice.diceSum)

  // Refs
  const playerRef = useRef(null); // Player <div> reference
  const isMountedRef = useRef(false); // To check if the component has mounted or not
  const siteDataRef = useRef(siteData);
  const positionsRef = useRef(board.positions);
  const playersDataRef = useRef(playersData);
  const currentPlayerRef = useRef(null);
  const diceSumRef = useRef(diceSum);
  const playerMoveAudio = useMemo(() => new Audio(audio1), []);
  const isMoving = playersData.players[currentPlayerId].isMoving;


  
  return <Player playerId={currentPlayerId} color={color} />;
};

export default PlayerWrapper;
