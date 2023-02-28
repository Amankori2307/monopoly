import { setAction } from '@monopoly/lib//core';
import useAppDispatch from 'src/hooks/redux/use-app-dispatch';
import useAppSelector from 'src/hooks/redux/use-app-selector';
import style from '../../../assets/css/action-info.module.scss';

const ActionInfo = () => {
  const actionData = useAppSelector((store) => store.actionData);
  const dispatch = useAppDispatch();
  const onClose = () => {
    dispatch(setAction(false, null));
  };
  return (
    <div className={style.actionInfo}>
      <div className={style.header}>
        <p className={style.title}>{actionData.currentAction}</p>
      </div>
      <div className={style.main}>
        <p>To {actionData.currentAction}, tap on the highlighted card.</p>
        <button className={style.close} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ActionInfo;
