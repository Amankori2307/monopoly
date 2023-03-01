import {
  buySite,
  debitPlayerMoney,
  MODAL_TYPES,
  setIsDone,
  setShowModal,
} from '@monopoly/lib//core';
import useAppDispatch from 'src/hooks/redux/use-app-dispatch';
import useAppSelector from 'src/hooks/redux/use-app-selector';
import style from '../../../assets/css/buy-card-modal.module.scss';
import CardModal from './CardModal';

interface BuyCardModalPropsType {
  card: number;
}
const BuyCardModal = (props: BuyCardModalPropsType) => {
  const { card } = props;
  const activePlayer = useAppSelector(
    (store) => store.playersData.activePlayer
  );
  const sites = useAppSelector((store) => store.siteData.sites);

  const dispatch = useAppDispatch();
  const onBuy = () => {
    dispatch(debitPlayerMoney(activePlayer, sites[card].sellingPrice));
    dispatch(buySite(activePlayer, sites[card]));
    dispatch(setShowModal(false, null));
    dispatch(setIsDone(true));
  };
  const onAuction = () => {
    dispatch(setShowModal(true, MODAL_TYPES.AUCTION_CARD));
  };
  return (
    <div>
      <CardModal card={sites[card]} />
      <div className={style.btnContainer}>
        <button className={`${style.btn} ${style.buy}`} onClick={onBuy}>
          Buy
        </button>
        <button className={`${style.btn} ${style.auction}`} onClick={onAuction}>
          Auction
        </button>
      </div>
    </div>
  );
};

export default BuyCardModal;
