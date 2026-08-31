/** Geometry shapes for the board grid. See boardLayout.utils.ts. */

export interface GridPosition {
  row: number;
  column: number;
}

export interface CellCenter {
  leftPercent: number;
  topPercent: number;
}

/** How far a crowded token sits from its space's centre, in board percent. */
export interface CrowdOffset {
  leftOffset: number;
  topOffset: number;
}
