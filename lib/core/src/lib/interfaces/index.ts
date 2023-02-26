import { CARD_TYPES, SITE_SUB_TYPE } from '../enums';

export type TActionType = string;
export type TPlayerSites = ISite[];
export type TPlayersSites = TPlayerSites[];
export type TBoughtBy = Array<number | null>;

export interface Action {
  type: TActionType;
  payload: any;
}

export interface IBoard {
  side: number;
  rowWidth: number;
  positions: IPositions[];
  isDone: boolean;
}

export interface IPositions {
  right: number;
  bottom: number;
  left: number;
  top: number;
  site: number;
}

export interface IDice {
  dice1: number;
  dice2: number;
  diceSum: number | null;
  setDiceSumCalledCount: number; // To identify if if SET_DICE_SUM was triggered
}

export interface ISite {
  id: number;
  type: CARD_TYPES;
  color: string;
  name: string;
  sellingPrice?: number;
  subType: SITE_SUB_TYPE;
  textColorOnShow: string;
  rent: number | number[];
  mortgage?: number;
  construction?: number;
  rentWithHouse: number[];
  isMortgaged?: boolean;
  built?: number;
  debit?: number;
}

export type TNoOfCardsInCategory = {
  [key in SITE_SUB_TYPE]: number;
};
