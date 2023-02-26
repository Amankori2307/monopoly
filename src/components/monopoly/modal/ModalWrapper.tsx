import { IState } from 'lib/core/src/lib';
import { useSelector } from 'react-redux';

import { modalTypes } from '../../../utility/constants';
import AuctionCardModal from './AuctionCardModal';
import BuyCardModal from './BuyCardModal';
import CardModal from './CardModal';
import ModalContainer from './ModalContainer';
import MyCards from './MyCards';

function ModalWrapper() {
  const modalData = useSelector((store: IState) => store.modalData);
  const currentCard = useSelector((store: IState) => store.card.currentCard);
  const playersData = useSelector((store: IState) => store.playersData);
  return (
    <>
      {modalData.showModal && (
        <>
          {modalData.currentModal === modalTypes.SHOW_CARD && (
            <ModalContainer component={CardModal} card={currentCard} />
          )}
          {modalData.currentModal === modalTypes.BUY_CARD && (
            <ModalContainer
              component={BuyCardModal}
              card={playersData.players[playersData.activePlayer].site}
              disableHideOnOuterClick={true}
            />
          )}
          {modalData.currentModal === modalTypes.AUCTION_CARD && (
            <ModalContainer
              component={AuctionCardModal}
              card={playersData.players[playersData.activePlayer].site}
              disableHideOnOuterClick={true}
            />
          )}
          {modalData.currentModal === modalTypes.MY_CARDS && (
            <ModalContainer component={MyCards} title={'My Cards'} />
          )}
        </>
      )}
    </>
  );
}

export default ModalWrapper;
