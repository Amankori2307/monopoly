/** Geometry shapes for the board grid. See boardLayout.utils.ts. */

export interface GridPosition {
  row: number;
  column: number;
}

export interface CellCenter {
  leftPercent: number;
  topPercent: number;
}
