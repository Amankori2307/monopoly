import { IBoard } from '../interfaces';
import { calcRowWidth, calculatePositions } from '../utils';

class Board {
  init(side: number): IBoard {
    const positions = calculatePositions(side);
    const rowWidth = calcRowWidth(side);
    return {
      side,
      rowWidth,
      positions,
      isDone: true,
    };
  }
}

export default Board;
