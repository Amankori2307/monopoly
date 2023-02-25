import { IBoard } from '../interfaces';
import { calcRowWidth, calculatePositions } from '../utils';

export class Board {
    init(side: number):IBoard{
        return {
            side,
            rowWidth: calcRowWidth(side),
            positions: calculatePositions(side),
            isDone: true
        }
    }
}


