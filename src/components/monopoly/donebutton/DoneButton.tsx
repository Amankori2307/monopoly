import { IState, setActivePlayer, setIsDone } from '@monopoly/lib//core';
import { useDispatch, useSelector } from 'react-redux';
import style from '../../../assets/css/done-button.module.scss';

const DoneButton = () => {
  const isDone = useSelector((store: IState) => store.board.isDone);
  const dispatch = useDispatch();
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
