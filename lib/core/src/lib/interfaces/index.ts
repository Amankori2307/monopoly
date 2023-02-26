import { ACTION_TYPES, CARD_TYPES, MODAL_TYPES, SITE_SUB_TYPE } from '../enums';

export type IActionType = string;
export type IPlayerSites = ISite[];
export type IPlayersSites = IPlayerSites[];
export type IBoughtBy = Array<number | null>;
export type IBoughtSites = Array<number | null>;
export interface IAction {
  type: IActionType;
  payload: any;
}

export interface IPositions {
  right: number;
  bottom: number;
  left: number;
  top: number;
  site: number;
}

export type INoOfCardsInCategory = {
  [key in SITE_SUB_TYPE]: number;
};

export interface IPlayer {
  site: number;
  previousSite: number;
  playerId: number;
  money: number;
  isMoving: boolean;
  direction: boolean;
}

// Reducer State Interfaces
export interface IDiceState {
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

export interface IBoardState {
  side: number;
  rowWidth: number;
  positions: IPositions[];
  isDone: boolean;
}

export interface IPlayerState {
  activePlayer: number;
  totalPlayers: number;
  players: IPlayer[];
}

export interface IModalState {
  showModal: boolean;
  currentModal: MODAL_TYPES | null;
  playerIdForMyCardsModal: number | null;
}

export interface IActionState {
  active: boolean;
  currentAction: ACTION_TYPES | null;
}

export interface ISiteState {
  sites: ISite[];
  boughtSites: number[];
  boughtBy: IBoughtBy;
  playersSites: IPlayersSites;
  noOfCardsInCategory: INoOfCardsInCategory;
}

export interface ICardState {
  showModal: boolean;
  currentCard?: ISite;
}

export interface IState {
  board: IBoardState;
  dice: IDiceState;
  playersData: IPlayerState;
  modalData: IModalState;
  actionData: IActionState;
  siteData: ISiteState;
  card: ICardState;
}
