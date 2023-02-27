import { setAction } from '@monopoly/lib//core';
import { IState } from 'lib/core/src/lib';
import { useDispatch, useSelector } from 'react-redux';
import style from '../../../assets/css/action-info.module.scss';
const ActionInfo = () => {
  const actionData = useSelector((store: IState) => store.actionData);
  const dispatch = useDispatch();
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
