import {
  appropriateActionHelper,
  creditPlayerMoney,
  debitPlayerMoney,
  getAllTurningPoints,
  movePlayer,
  setIsDone,
  setIsMoving,
  setPlayerPositionRecursiveHelper,
  setShowModal,
} from '@monopoly/lib//core';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { connect, useDispatch } from 'react-redux';
import audio1 from '../../../assets/audio/playermove.wav';
import style from '../../../assets/css/player.module.scss';
import { directions } from '../../../utility/constants';

function Player({
  playersData,
  diceSum,
  movePlayer,
  board,
  setDiceSumCalledCount,
  color,
  currentPlayerId,
  setShowModal,
  siteData,
  debitPlayerMoney,
  creditPlayerMoney,
  setIsMoving,
  noOfCardsInCategory,
}) {
  const dispatch = useDispatch();
  const playerRef = useRef(null); // Player <div> reference
  const isMountedRef = useRef(false); // To check if the component has mounted or not
  const playerMoveAudio = useMemo(() => new Audio(audio1), []);
  const siteDataRef = useRef(siteData);
  const positionsRef = useRef(board.positions);
  const playersDataRef = useRef(playersData);
  const currentPlayerRef = useRef(null);
  const diceSumRef = useRef(diceSum);
  const isMoving = playersData.players[currentPlayerId].isMoving;

  // To show appropriate modal or do appropriate action
  const appropriateAction = useCallback(() => {
    const currentSiteId = currentPlayerRef.current.site;
    const currentSite = siteDataRef.current.sites[currentSiteId];
    const { activePlayer, totalPlayers } = playersDataRef.current;
    appropriateActionHelper(
      currentSite,
      currentPlayerRef.current,
      activePlayer,
      totalPlayers,
      siteDataRef.current,
      diceSumRef.current,
      noOfCardsInCategory,
      debitPlayerMoney,
      creditPlayerMoney,
      () => dispatch(setIsDone()),
      setShowModal,
      movePlayer
    );
  }, [
    creditPlayerMoney,
    debitPlayerMoney,
    movePlayer,
    noOfCardsInCategory,
    setIsDone,
    setShowModal,
  ]);

  // To move player when there are multple turns
  const setPlayerPositionRecursive = useCallback(
    async (turningPoints) => {
      setPlayerPositionRecursiveHelper(
        turningPoints,
        currentPlayerRef.current.site,
        positionsRef.current,
        playersDataRef.current.players,
        playersDataRef.current.totalPlayers,
        currentPlayerId,
        playerRef.current,
        playerMoveAudio,
        isMountedRef.current,
        setIsMoving
      );
    },
    [setIsMoving, currentPlayerId, playerMoveAudio]
  );

  // Update active players position in redux on dice roll
  useEffect(() => {
    if (
      isMountedRef.current &&
      playersDataRef.current.activePlayer === currentPlayerId
    ) {
      console.log(
        'useEffect1 ID(Update activePlayer postion in redux) Player' +
          currentPlayerId
      );
      const currentSite = (currentPlayerRef.current.site + diceSum) % 40;
      movePlayer(currentPlayerId, currentSite, directions.FORWARD);
    }
  }, [diceSum, currentPlayerId, movePlayer, setDiceSumCalledCount]); // Adding 'setDiceSumCalledCount' because if previous 'diceSUm' is equal to current 'diceSum' it does not get called

  // To move player(actually move player on board in UI[Brower Window])
  useEffect(() => {
    if (isMoving || isMountedRef.current === false) {
      currentPlayerRef.current =
        playersDataRef.current.players[currentPlayerId];
      const turningPoints = getAllTurningPoints(
        currentPlayerRef.current.previousSite,
        currentPlayerRef.current.site,
        currentPlayerRef.current.direction
      );
      setPlayerPositionRecursive(turningPoints);
      console.log(`useEffect2(Move Player In UI) Player${currentPlayerId}`);
    }
  }, [setPlayerPositionRecursive, currentPlayerId, isMoving]);

  // Show Appropriate modal or do appropriate action
  useEffect(() => {
    if (
      isMountedRef.current &&
      isMoving === false &&
      playersDataRef.current.activePlayer === currentPlayerId
    ) {
      console.log(`useEffect3(Appropriate action) Player${currentPlayerId}`);
      appropriateAction();
    } else if (isMountedRef.current === false) {
      isMountedRef.current = true;
    }
  }, [isMoving, appropriateAction, currentPlayerId]);

  // To update playersDataRef and siteDateRef
  useEffect(() => {
    siteDataRef.current = siteData;
    playersDataRef.current = playersData;
    diceSumRef.current = diceSum;
  }, [playersData, siteData, diceSum]);

  return (
    <div className={`${style.player} player-${color}`} ref={playerRef}>
      {currentPlayerId}
    </div>
  );
}
const mapStateToProps = (store) => {
  return {
    playersData: store.playersData,
    diceSum: store.dice.diceSum,
    setDiceSumCalledCount: store.dice.setDiceSumCalledCount,
    board: store.board,
    siteData: store.siteData,
    noOfCardsInCategory: store.siteData.noOfCardsInCategory,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    movePlayer: (playerId, currentSite, direction) =>
      dispatch(movePlayer(playerId, currentSite, direction)),
    setShowModal: (showModal, currentModal) =>
      dispatch(setShowModal(showModal, currentModal)),
    debitPlayerMoney: (playerId, amount) =>
      dispatch(debitPlayerMoney(playerId, amount)),
    creditPlayerMoney: (playerId, amount) =>
      dispatch(creditPlayerMoney(playerId, amount)),
    setIsMoving: (playerId, isMoving) =>
      dispatch(setIsMoving(playerId, isMoving)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Player);
