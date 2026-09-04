import type { CellCenter, CrowdOffset, GridPosition } from './boardLayout.interfaces';

export type { CellCenter, CrowdOffset, GridPosition } from './boardLayout.interfaces';

import { BOARD_SIZE, JAIL_POSITION } from '../constants/game.constants';

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

/**
 * Where each token in a crowd sits, as multiples of one step from the cell
 * centre. Centre first, then the diagonals, then the edges: a lone token - much
 * the commonest case - stays exactly on its space, and a crowd grows outwards
 * around it symmetrically.
 */
// Must hold at least MAX_PLAYERS entries or two players would share a slot;
// boardLayout.utils.test.ts asserts every position is distinct.
const CROWD_SLOTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
  [0, -1],
  [0, 1],
  [-1, 0],
];

/** Spacing between clustered tokens, as a percentage of the board. */
const CROWD_STEP_PERCENT = 2.4;

/**
 * Where a token sits when it shares a space with others.
 *
 * A bounded cluster rather than a running diagonal: the offset used to be
 * `index * step` on both axes, which walked the eighth token clean off the board
 * at a corner. The extent here is fixed by the slot table, so it cannot grow
 * with the crowd however many players there are.
 */
export const getTokenCrowdOffset = (crowdIndex: number): CrowdOffset => {
  const index = Math.max(0, Math.min(crowdIndex, CROWD_SLOTS.length - 1));
  const [column, row] = CROWD_SLOTS[index];

  return {
    leftOffset: column * CROWD_STEP_PERCENT,
    topOffset: row * CROWD_STEP_PERCENT,
  };
};

// ---------------------------------------------------------------------------
// The Jail corner
//
// One square holding two places: a barred cell for players actually in jail,
// and an L-shaped visiting band along the two outer edges for everyone else.
// Both the stylesheet and the token maths derive from JAIL_BAND_FRACTION, so
// the band the eye sees and the band a token stands on cannot drift apart.
// ---------------------------------------------------------------------------

/** The visiting band's width, as a fraction of the corner cell's side. */
export const JAIL_BAND_FRACTION = 0.34;

/** A corner cell's side, in board percent. Derived, never written twice. */
export const CORNER_CELL_PERCENT = (CORNER_TRACK / TOTAL_TRACKS) * 100;

/**
 * Tighter than an ordinary crowd, because the jail cell is two thirds of an
 * already-small square. Eight tokens still clear its walls.
 */
const JAIL_CLUSTER_SCALE = 0.85;

/** Spacing along the visiting band's midline, in board percent. */
const JAIL_BAND_STEP_PERCENT = 2.2;

/**
 * Where visitors queue, signed from the elbow of the L.
 *
 * One dimension, not two: the band is a corridor, so a second axis would put a
 * token through a wall. Zero first, so a lone visitor stands at the elbow -
 * where a printed board puts them - and a crowd grows both ways along the arms.
 */
const JAIL_BAND_SLOTS: readonly number[] = [0, 1, -1, 2, -2, 3, -3, 4];

/**
 * Which way the board centre lies from the Jail corner, as unit steps.
 *
 * Derived from the grid rather than written as "up and to the right": where the
 * corner sits is a fact the layout already owns, and a hardcoded direction here
 * would be a second place to fix if the board were ever laid out the other way
 * round. Column 1 means inward is +x; the bottom row means inward is -y.
 */
const jailInwardSigns = () => {
  const { row, column } = boardIndexToGridPosition(JAIL_POSITION);
  return {
    x: column === 1 ? 1 : -1,
    y: row === BOARD_GRID_SIZE ? -1 : 1,
  };
};

/**
 * Distinguishes the two halves of the Jail square when counting a crowd.
 *
 * Without it a jailed player and a visitor would draw slots from one tally, and
 * the only visitor on the board would stand in the second slot of a cluster
 * they are not part of.
 */
export const tokenCrowdKey = (spaceIndex: number, inJail: boolean): string =>
  spaceIndex === JAIL_POSITION && inJail ? `${spaceIndex}:jail` : `${spaceIndex}`;

/**
 * Where a token stands, in board percent - the single call the token layer makes.
 *
 * Off the Jail square, and for anyone merely visiting it, this is the ordinary
 * cell centre plus its crowd offset. `inJail` changes nothing anywhere else:
 * no other square has two places to stand.
 */
export const getTokenPosition = (
  spaceIndex: number,
  crowdIndex: number,
  inJail = false
): CellCenter => {
  const centre = getBoardCellCenter(spaceIndex);
  const crowd = getTokenCrowdOffset(crowdIndex);

  if (spaceIndex !== JAIL_POSITION) {
    return {
      leftPercent: centre.leftPercent + crowd.leftOffset,
      topPercent: centre.topPercent + crowd.topOffset,
    };
  }

  const inward = jailInwardSigns();
  const halfBand = (CORNER_CELL_PERCENT * JAIL_BAND_FRACTION) / 2;

  if (inJail) {
    // The cell is the corner square inset by the band on its two outer edges,
    // so its centre sits half a band's width towards the board centre.
    return {
      leftPercent:
        centre.leftPercent + inward.x * halfBand + crowd.leftOffset * JAIL_CLUSTER_SCALE,
      topPercent:
        centre.topPercent + inward.y * halfBand + crowd.topOffset * JAIL_CLUSTER_SCALE,
    };
  }

  // Visiting: stand on the band's midline, which runs along the two outer edges.
  const elbowLeft = centre.leftPercent - inward.x * (CORNER_CELL_PERCENT / 2 - halfBand);
  const elbowTop = centre.topPercent - inward.y * (CORNER_CELL_PERCENT / 2 - halfBand);
  const slotIndex = Math.max(0, Math.min(crowdIndex, JAIL_BAND_SLOTS.length - 1));
  const step = JAIL_BAND_SLOTS[slotIndex] * JAIL_BAND_STEP_PERCENT;
  const distance = Math.abs(step);

  // The sign picks the arm, never the direction: both arms run from the elbow
  // towards the board centre, so both walk along `inward`. Signing the distance
  // instead sent the first visitor straight out through the board's edge.
  return step >= 0
    ? { leftPercent: elbowLeft + inward.x * distance, topPercent: elbowTop }
    : { leftPercent: elbowLeft, topPercent: elbowTop + inward.y * distance };
};
