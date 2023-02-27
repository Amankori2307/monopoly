import { IActionType } from 'lib/core/src/lib';

export const SET_PLAYER_ID_FOR_MY_CARDS_MODAL: IActionType =
  'SET_PLAYER_ID_FOR_MY_CARDS_MODAL';
export const SET_SHOW_MODAL: IActionType = 'SET_SHOW_MODAL';

export const setShowModal = (showModal, currentModal) => {
  return {
    type: SET_SHOW_MODAL,
    payload: {
      showModal,
      currentModal,
    },
  };
};

export const setPlayerIdForMyCardsModal = (playerId) => {
  return {
    type: SET_PLAYER_ID_FOR_MY_CARDS_MODAL,
    payload: playerId,
  };
};
