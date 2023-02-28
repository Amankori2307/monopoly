import { setAction } from '@monopoly/lib//core';
import { ACTION_TYPES } from 'lib/core/src/lib';
import useAppDispatch from 'src/hooks/redux/use-app-dispatch';
import useAppSelector from 'src/hooks/redux/use-app-selector';
import style from '../../../assets/css/actions.module.scss';

const Actions = () => {
  const active = useAppSelector((store) => store.actionData.active);
  const dispatch = useAppDispatch();
  const setActionHelper = (e: MouseEvent<HTMLElement>) => {
    const elem = e.target;
    const actionType = elem.getAttribute('action-type');
    dispatch(setAction(true, actionType));
  };
  return (
    <div className={style.actions}>
      <button
        disabled={active}
        className={`${style.build} ${style.btn} `}
        onClick={setActionHelper}
        action-type={ACTION_TYPES.BUILD}
      >
        Build
      </button>
      <button
        disabled={active}
        className={`${style.sell} ${style.btn}`}
        onClick={setActionHelper}
        action-type={ACTION_TYPES.SELL}
      >
        Sell
      </button>
      <button
        disabled={active}
        className={`${style.mortgage} ${style.btn}`}
        onClick={setActionHelper}
        action-type={ACTION_TYPES.MORTGAGE}
      >
        Mortgage
      </button>
      <button
        disabled={active}
        className={`${style.redeem} ${style.btn}`}
        onClick={setActionHelper}
        action-type={ACTION_TYPES.REDEEM}
      >
        Redeem
      </button>
    </div>
  );
};

export default Actions;
