import { setPlayerIdForMyCardsModal, setShowModal } from '@monopoly/lib//core';
import { IState } from 'lib/core/src/lib';
import { useDispatch, useSelector } from 'react-redux';
import style from '../../../assets/css/player-details.module.scss';
import { colors, modalTypes } from '../../../utility/constants';

interface PlayerDetailsPropsType {
  playerId: number;
}

const PlayerDetails = (props: PlayerDetailsPropsType) => {
  const { playerId } = props;
  const dispatch = useDispatch();
  const playersData = useSelector((store: IState) => store.playersData);

  const player = playersData.players[playerId];
  const active = playersData.activePlayer === playerId;
  const color = colors[playerId];

  const viewMyCards = () => {
    dispatch(setShowModal(true, modalTypes.MY_CARDS));
    dispatch(setPlayerIdForMyCardsModal(player.playerId));
  };

  return (
    <div
      className={`${style.playerDetails} ${style[color]} ${
        active ? style.active : ''
      }`}
    >
      <div className={style.header}>
        <p className={style.playerName}>Player {player.playerId}</p>
        <div className={style.overley}></div>
      </div>
      <div className={style.details}>
        <p className={style.playerMoney}>
          <b>Money:</b> ${player.money}
        </p>
        <button className={style.viewMyCards} onClick={viewMyCards}>
          Views My Cards
        </button>
      </div>
    </div>
  );
};
export default PlayerDetails;
