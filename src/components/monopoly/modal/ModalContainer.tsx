import { setShowModal } from '@monopoly/lib//core';
import useAppDispatch from 'src/hooks/redux/use-app-dispatch';
import style from '../../../assets/css/modal.module.scss';
import closeIcon from '../../../assets/images/times-solid.svg';

const ModalContainer = ({
  component,
  disableHideOnOuterClick,
  title,
  ...rest
}) => {
  const dispatch = useAppDispatch();
  const hideOnClick = () => {
    dispatch(setShowModal(false, null));
  };
  const preventModalCloseOnClick = (e: MouseEvent<HTMLElement>) => {
    if (e && e.stopPropagation) e.stopPropagation();
  };
  return (
    <div
      className={style.modalContainer}
      onClick={() => (disableHideOnOuterClick ? '' : hideOnClick())}
    >
      <div className={style.cardModal} onClick={preventModalCloseOnClick}>
        {!disableHideOnOuterClick && (
          <div className={style.closeStrip}>
            <span className={style.title}>{title}</span>
            <img
              src={closeIcon}
              className={style.close}
              onClick={hideOnClick}
              alt="close-icon"
            />
          </div>
        )}

        <div className={style.cardContent}>
          <Component
            hideOnClick={hideOnClick}
            onClick={preventModalCloseOnClick}
            {...rest}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalContainer;
