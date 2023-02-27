import { IActionType } from '../../../interfaces';

export const SET_CURRENT_CARD: IActionType = 'SET_CURRENT_CARD';
export const setCurrentCard = (cardData) => {
  return {
    type: SET_CURRENT_CARD,
    payload: cardData,
  };
};
