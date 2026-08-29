import { BOARD_SIZE } from '../constants/game.constants';

export interface GridPosition {
  row: number;
  column: number;
}

/** The board renders as an 11x11 CSS grid: 4 corners plus 9 spaces per side. */
export const BOARD_GRID_SIZE = 11;

const SPACES_PER_SIDE = 10;

/**
 * Maps a board index (0-39) onto a grid cell, walking anticlockwise from GO:
 * bottom row right-to-left, up the left column, across the top left-to-right,
 * then down the right column.
 */
export const boardIndexToGridPosition = (index: number): GridPosition => {
  const normalised = ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;

  if (normalised <= SPACES_PER_SIDE) {
    return { row: BOARD_GRID_SIZE, column: BOARD_GRID_SIZE - normalised };
  }
  if (normalised <= SPACES_PER_SIDE * 2) {
    return {
      row: BOARD_GRID_SIZE - (normalised - SPACES_PER_SIDE),
      column: 1,
    };
  }
  if (normalised <= SPACES_PER_SIDE * 3) {
    return { row: 1, column: normalised - SPACES_PER_SIDE * 2 + 1 };
  }
  return { row: normalised - SPACES_PER_SIDE * 3 + 1, column: BOARD_GRID_SIZE };
};
