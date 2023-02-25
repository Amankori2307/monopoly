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

