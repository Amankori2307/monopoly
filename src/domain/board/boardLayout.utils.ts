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

/** Grid track sizes: corners are wider, the nine spaces between them are 1fr. */
const CORNER_TRACK = 1.7;
const SPACE_TRACK = 1;
const TOTAL_TRACKS = CORNER_TRACK * 2 + SPACE_TRACK * 9;

const trackSize = (line: number) =>
  line === 1 || line === BOARD_GRID_SIZE ? CORNER_TRACK : SPACE_TRACK;

/** Distance from the board edge to the start of a grid line, in track units. */
const trackOffset = (line: number) => {
  let offset = 0;
  for (let current = 1; current < line; current += 1) {
    offset += trackSize(current);
  }
  return offset;
};

export interface CellCenter {
  leftPercent: number;
  topPercent: number;
}

/**
 * Centre of a board space as a percentage of the board, so a token can be
 * positioned absolutely and animated between spaces. Grid placement alone gives
 * no motion - the token would jump from cell to cell.
 */
export const getBoardCellCenter = (index: number): CellCenter => {
  const { row, column } = boardIndexToGridPosition(index);
  const toPercent = (line: number) =>
    ((trackOffset(line) + trackSize(line) / 2) / TOTAL_TRACKS) * 100;

  return { leftPercent: toPercent(column), topPercent: toPercent(row) };
};
