import React from "react";
import { connect } from "react-redux";

import { modalTypes } from "../../../utility/constants";
import AuctionCardModal from "./AuctionCardModal";
import BuyCardModal from "./BuyCardModal";
import CardModal from "./CardModal";
import ModalContainer from "./ModalContainer";
import MyCards from "./MyCards";

function ModalWrapper({ modalData, currentCard, playersData }) {
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
            <ModalContainer component={MyCards} title={"My Cards"} />
          )}
        </>
      )}
    </>
  );
}

const mapStateToProps = (store) => {
  return {
    modalData: store.modalData,
    currentCard: store.card.currentCard,
    playersData: store.playersData,
  };
};

export default connect(mapStateToProps)(ModalWrapper);
