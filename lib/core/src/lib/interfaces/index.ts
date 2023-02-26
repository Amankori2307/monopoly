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
