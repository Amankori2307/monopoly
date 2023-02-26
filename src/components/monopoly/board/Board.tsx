import { useSelector } from 'react-redux';
import style from '../../../assets/css/board.module.scss';
import { IState } from '../../../redux/reducers/rootReducer';
import ActionInfo from '../action/ActionInfo';
import DiceContainer from '../dice/DiceContainer';
import DoneButton from '../donebutton/DoneButton';
import Actions from '../modal/Actions';
import PlayerContainer from '../player/PlayerContainer';
import PlayerDetailsContainer from '../player/PlayerDetailsContainer';
import Row from '../row/Row';

const Board = () => {
  const side = useSelector((store: IState) => store.board.side);
  const totalPlayers = useSelector(
    (store: IState) => store.playersData.totalPlayers
  );
  const sites = useSelector((store: IState) => store.siteData.sites);
  const active = useSelector((store: IState) => store.actionData.active);

  return (
    <>
      <div
        className={style.board}
        style={{ width: side + 'px', height: side + 'px' }}
      >
        {[
          sites.slice(0, 10).reverse(),
          sites.slice(10, 20).reverse(),
          sites.slice(20, 30),
          sites.slice(30, 40),
        ].map((data, index) => (
          <Row key={index} data={data} rowNum={index + 1} />
        ))}
        <DiceContainer />
        <DoneButton />
        <PlayerContainer totalPlayers={totalPlayers} />
        {active && <ActionInfo />}
      </div>
      <PlayerDetailsContainer />
      <Actions />
    </>
  );
};

export default Board;
