import { setActivePlayer, setIsDone } from '@monopoly/lib//core';
import useAppDispatch from 'src/hooks/redux/use-app-dispatch';
import useAppSelector from 'src/hooks/redux/use-app-selector';
import style from '../../../assets/css/done-button.module.scss';

const DoneButton = () => {
  const isDone = useAppSelector((store) => store.board.isDone);
  const dispatch = useAppDispatch();
  const done = () => {
    if (isDone) {
      dispatch(setActivePlayer());
      dispatch(setIsDone(false));
    }
  };
  return (
    <button
      onClick={done}
      className={`${style.doneButton} ${!isDone ? style.inactive : ''}`}
    >
      Done
    </button>
  );
};

export default DoneButton;
