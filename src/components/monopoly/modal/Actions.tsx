import { IState } from 'lib/core/src/lib';
import { useDispatch, useSelector } from 'react-redux';
import { setAction } from 'src/redux/actions/action';
import style from '../../../assets/css/actions.module.scss';
import { actionTypes } from '../../../utility/constants';

const Actions = () => {
  const active = useSelector((store: IState) => store.actionData.active);
  const dispatch = useDispatch();
  const setActionHelper = (e: MouseEvent<HTMLElement> ) => {
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
        action-type={actionTypes.BUILD}
      >
        Build
      </button>
      <button
        disabled={active}
        className={`${style.sell} ${style.btn}`}
        onClick={setActionHelper}
        action-type={actionTypes.SELL}
      >
        Sell
      </button>
      <button
        disabled={active}
        className={`${style.mortgage} ${style.btn}`}
        onClick={setActionHelper}
        action-type={actionTypes.MORTGAGE}
      >
        Mortgage
      </button>
      <button
        disabled={active}
        className={`${style.redeem} ${style.btn}`}
        onClick={setActionHelper}
        action-type={actionTypes.REDEEM}
      >
        Redeem
      </button>
    </div>
  );
};

export default Actions;
