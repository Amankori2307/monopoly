import { MODAL_TYPES } from 'lib/core/src/lib';
import useAppSelector from 'src/hooks/redux/use-app-selector';

import AuctionCardModal from './AuctionCardModal';
import BuyCardModal from './BuyCardModal';
import CardModal from './CardModal';
import ModalContainer from './ModalContainer';
import MyCards from './MyCards';

function ModalWrapper() {
  const modalData = useAppSelector((store) => store.modalData);
  const currentCard = useAppSelector((store) => store.card.currentCard);
  const playersData = useAppSelector((store) => store.playersData);
  return (
    <>
      {modalData.showModal && (
        <>
          {modalData.currentModal === MODAL_TYPES.SHOW_CARD && (
            <ModalContainer component={CardModal} card={currentCard} />
          )}
          {modalData.currentModal === MODAL_TYPES.BUY_CARD && (
            <ModalContainer
              component={BuyCardModal}
              card={playersData.players[playersData.activePlayer].site}
              disableHideOnOuterClick={true}
            />
          )}
          {modalData.currentModal === MODAL_TYPES.AUCTION_CARD && (
            <ModalContainer
              component={AuctionCardModal}
              card={playersData.players[playersData.activePlayer].site}
              disableHideOnOuterClick={true}
            />
          )}
          {modalData.currentModal === MODAL_TYPES.MY_CARDS && (
            <ModalContainer component={MyCards} title={'My Cards'} />
          )}
        </>
      )}
    </>
  );
}

export default ModalWrapper;
