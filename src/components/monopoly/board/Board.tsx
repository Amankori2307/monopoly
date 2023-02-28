import useAppSelector from 'src/hooks/redux/use-app-selector';
import style from '../../../assets/css/board.module.scss';
import ActionInfo from '../action/ActionInfo';
import DiceContainer from '../dice/DiceContainer';
import DoneButton from '../donebutton/DoneButton';
import Actions from '../modal/Actions';
import PlayerContainer from '../player/PlayerContainer';
import PlayerDetailsContainer from '../player/PlayerDetailsContainer';
import Row from '../row/Row';

const Board = () => {
  const side = useAppSelector((store) => store.board.side);
  const totalPlayers = useAppSelector(
    (store) => store.playersData.totalPlayers
  );
  const sites = useAppSelector((store) => store.siteData.sites);
  const active = useAppSelector((store) => store.actionData.active);

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
        ].map((sitesInRow, index) => (
          <Row key={index} sitesInRow={sitesInRow} rowNum={index + 1} />
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
