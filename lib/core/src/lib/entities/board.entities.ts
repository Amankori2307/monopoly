import { IBoardState } from '../interfaces';
import { calcRowWidth, calculatePositions } from '../utils';

export class Board {
  init(side: number): IBoardState {
    return {
      side,
      rowWidth: calcRowWidth(side),
      positions: calculatePositions(side),
      isDone: true,
    };
  }
}
