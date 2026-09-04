import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  CORNER_POSITIONS,
  JAIL_POSITION,
  MAX_PLAYERS,
} from '../constants/game.constants';
import {
  BOARD_GRID_SIZE,
  boardIndexToGridPosition,
  CORNER_CELL_PERCENT,
  getBoardCellCenter,
  getTokenCrowdOffset,
  getTokenPosition,
  JAIL_BAND_FRACTION,
  tokenCrowdKey,
} from './boardLayout.utils';

describe('boardIndexToGridPosition', () => {
  it('places GO in the bottom-right corner', () => {
    expect(boardIndexToGridPosition(0)).toEqual({ row: 11, column: 11 });
  });

  it('walks the bottom row right to left', () => {
    expect(boardIndexToGridPosition(1)).toEqual({ row: 11, column: 10 });
    expect(boardIndexToGridPosition(9)).toEqual({ row: 11, column: 2 });
  });

  it('places each corner at a grid corner', () => {
    const [go, jail, freeParking, goToJail] = CORNER_POSITIONS.map(
      boardIndexToGridPosition
    );

    expect(go).toEqual({ row: 11, column: 11 });
    expect(jail).toEqual({ row: 11, column: 1 });
    expect(freeParking).toEqual({ row: 1, column: 1 });
    expect(goToJail).toEqual({ row: 1, column: 11 });
  });

  it('keeps every space inside the grid and on an edge', () => {
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const { row, column } = boardIndexToGridPosition(index);

      expect(row).toBeGreaterThanOrEqual(1);
      expect(row).toBeLessThanOrEqual(BOARD_GRID_SIZE);
      expect(column).toBeGreaterThanOrEqual(1);
      expect(column).toBeLessThanOrEqual(BOARD_GRID_SIZE);
      // A perimeter cell always touches at least one edge.
      const onEdge =
        row === 1 ||
        row === BOARD_GRID_SIZE ||
        column === 1 ||
        column === BOARD_GRID_SIZE;
      expect(onEdge).toBe(true);
    }
  });

  it('gives every space a unique cell', () => {
    const cells = new Set(
      Array.from({ length: BOARD_SIZE }, (_, index) => {
        const { row, column } = boardIndexToGridPosition(index);
        return `${row}:${column}`;
      })
    );

    expect(cells.size).toBe(BOARD_SIZE);
  });

  it('wraps indexes outside the board', () => {
    expect(boardIndexToGridPosition(BOARD_SIZE)).toEqual(boardIndexToGridPosition(0));
    expect(boardIndexToGridPosition(-1)).toEqual(
      boardIndexToGridPosition(BOARD_SIZE - 1)
    );
  });
});

describe('getBoardCellCenter', () => {
  it('puts GO in the bottom-right corner', () => {
    const { leftPercent, topPercent } = getBoardCellCenter(0);

    expect(leftPercent).toBeGreaterThan(90);
    expect(topPercent).toBeGreaterThan(90);
  });

  it('puts Free Parking in the top-left corner', () => {
    const { leftPercent, topPercent } = getBoardCellCenter(20);

    expect(leftPercent).toBeLessThan(10);
    expect(topPercent).toBeLessThan(10);
  });

  it('keeps every space inside the board', () => {
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const { leftPercent, topPercent } = getBoardCellCenter(index);

      expect(leftPercent).toBeGreaterThan(0);
      expect(leftPercent).toBeLessThan(100);
      expect(topPercent).toBeGreaterThan(0);
      expect(topPercent).toBeLessThan(100);
    }
  });

  it('gives every space a distinct centre', () => {
    const centres = new Set(
      Array.from({ length: BOARD_SIZE }, (_, index) => {
        const { leftPercent, topPercent } = getBoardCellCenter(index);
        return `${leftPercent.toFixed(3)}:${topPercent.toFixed(3)}`;
      })
    );

    expect(centres.size).toBe(BOARD_SIZE);
  });

  // Adjacent spaces along a side must be evenly spaced.
  it('spaces consecutive bottom-row cells evenly', () => {
    const gap = (a: number, b: number) =>
      Math.abs(getBoardCellCenter(a).leftPercent - getBoardCellCenter(b).leftPercent);

    expect(gap(2, 3)).toBeCloseTo(gap(3, 4), 5);
  });
});

describe('getTokenCrowdOffset', () => {
  /**
   * The narrowest cell is a non-corner space: one 1fr track out of
   * 1.7 + 1.7 + 9 = 12.4, so about 8% of the board wide. Half of that either
   * side of the centre is the budget an offset has to stay inside.
   */
  const CELL_HALF_WIDTH_PERCENT = (1 / 12.4 / 2) * 100;

  // Most spaces hold one token or none, so this is the case that has to be right.
  it('puts a lone token exactly on its space', () => {
    expect(getTokenCrowdOffset(0)).toEqual({ leftOffset: 0, topOffset: 0 });
  });

  it('keeps every token inside its cell at the maximum player count', () => {
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      const { leftOffset, topOffset } = getTokenCrowdOffset(index);

      expect(Math.abs(leftOffset)).toBeLessThan(CELL_HALF_WIDTH_PERCENT);
      expect(Math.abs(topOffset)).toBeLessThan(CELL_HALF_WIDTH_PERCENT);
    }
  });

  // The offset used to be `index * step` on both axes, so the eighth token at a
  // corner landed past 100% - off the board entirely.
  it('does not grow with the crowd', () => {
    const extents = Array.from({ length: MAX_PLAYERS }, (unused, index) => {
      const { leftOffset, topOffset } = getTokenCrowdOffset(index);
      return Math.max(Math.abs(leftOffset), Math.abs(topOffset));
    });

    expect(Math.max(...extents)).toBe(Math.max(...extents.slice(0, 2)));
  });

  it('grows outwards around the centre', () => {
    const second = getTokenCrowdOffset(1);

    expect(second.leftOffset).toBeLessThan(0);
    expect(getTokenCrowdOffset(2).leftOffset).toBeGreaterThan(0);
    expect(getTokenCrowdOffset(2).topOffset).toBe(second.topOffset);
  });

  it('gives each token in a crowd its own position', () => {
    const seen = new Set(
      Array.from({ length: MAX_PLAYERS }, (unused, index) => {
        const { leftOffset, topOffset } = getTokenCrowdOffset(index);
        return `${leftOffset},${topOffset}`;
      })
    );

    expect(seen.size).toBe(MAX_PLAYERS);
  });

  // Defensive: the engine caps players at MAX_PLAYERS, but an offset that ran
  // off the board is exactly the bug being fixed, so clamp rather than trust.
  it('clamps an index beyond the maximum player count', () => {
    expect(getTokenCrowdOffset(99)).toEqual(getTokenCrowdOffset(MAX_PLAYERS - 1));
    expect(getTokenCrowdOffset(-3)).toEqual(getTokenCrowdOffset(0));
  });
});

/**
 * The Jail corner: one square, two places to stand.
 *
 * Bounds are expressed from the exported constants rather than from measured
 * numbers, so re-tuning the band width re-tunes the test with it - the whole
 * point of there being one constant.
 */
describe('getTokenPosition at the Jail corner', () => {
  const centre = getBoardCellCenter(JAIL_POSITION);
  const half = CORNER_CELL_PERCENT / 2;
  const band = CORNER_CELL_PERCENT * JAIL_BAND_FRACTION;

  // Jail is the bottom-left corner: x grows towards the board centre, y shrinks.
  const cell = {
    left: centre.leftPercent - half + band,
    right: centre.leftPercent + half,
    top: centre.topPercent - half,
    bottom: centre.topPercent + half - band,
  };
  const square = {
    left: centre.leftPercent - half,
    right: centre.leftPercent + half,
    top: centre.topPercent - half,
    bottom: centre.topPercent + half,
  };

  /** Half a token, in board percent - the widest it gets on a small board. */
  const TOKEN_HALF = 1.8;

  const inside = (
    box: { left: number; right: number; top: number; bottom: number },
    at: { leftPercent: number; topPercent: number },
    margin = 0
  ) =>
    at.leftPercent - margin >= box.left &&
    at.leftPercent + margin <= box.right &&
    at.topPercent - margin >= box.top &&
    at.topPercent + margin <= box.bottom;

  it('leaves every other square exactly as it was', () => {
    expect(getTokenPosition(0, 0)).toEqual({
      leftPercent: getBoardCellCenter(0).leftPercent + getTokenCrowdOffset(0).leftOffset,
      topPercent: getBoardCellCenter(0).topPercent + getTokenCrowdOffset(0).topOffset,
    });
    expect(getTokenPosition(25, 3)).toEqual({
      leftPercent: getBoardCellCenter(25).leftPercent + getTokenCrowdOffset(3).leftOffset,
      topPercent: getBoardCellCenter(25).topPercent + getTokenCrowdOffset(3).topOffset,
    });
  });

  // inJail is meaningless anywhere else, and must not quietly move a token.
  it('ignores inJail away from the Jail square', () => {
    [0, 20, 30, 7].forEach((index) => {
      expect(getTokenPosition(index, 0, true)).toEqual(getTokenPosition(index, 0, false));
    });
  });

  it('stands a jailed player inside the cell', () => {
    expect(inside(cell, getTokenPosition(JAIL_POSITION, 0, true))).toBe(true);
  });

  it('stands a visitor outside the cell but inside the square', () => {
    const at = getTokenPosition(JAIL_POSITION, 0, false);

    expect(inside(square, at)).toBe(true);
    expect(inside(cell, at)).toBe(false);
  });

  // The whole point of the split: the two must never resolve to one spot.
  it('never puts a jailed player where a visitor stands', () => {
    for (let jailed = 0; jailed < MAX_PLAYERS; jailed += 1) {
      for (let visiting = 0; visiting < MAX_PLAYERS; visiting += 1) {
        expect(getTokenPosition(JAIL_POSITION, jailed, true)).not.toEqual(
          getTokenPosition(JAIL_POSITION, visiting, false)
        );
      }
    }
  });

  it('fits a full table of jailed players in the cell, token width included', () => {
    const seen = new Set<string>();

    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      const at = getTokenPosition(JAIL_POSITION, index, true);
      expect(inside(cell, at, TOKEN_HALF), `token ${index} escaped the cell`).toBe(true);
      seen.add(`${at.leftPercent},${at.topPercent}`);
    }

    expect(seen.size).toBe(MAX_PLAYERS);
  });

  it('fits a full table of visitors on the band, and none of them in the cell', () => {
    const seen = new Set<string>();

    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      const at = getTokenPosition(JAIL_POSITION, index, false);
      expect(inside(square, at, TOKEN_HALF), `visitor ${index} left the square`).toBe(
        true
      );
      expect(inside(cell, at), `visitor ${index} wandered into the cell`).toBe(false);
      seen.add(`${at.leftPercent},${at.topPercent}`);
    }

    expect(seen.size).toBe(MAX_PLAYERS);
  });

  // Parity with getTokenCrowdOffset, which clamps for the same reason.
  it('clamps a crowd index beyond the table', () => {
    expect(getTokenPosition(JAIL_POSITION, 99, true)).toEqual(
      getTokenPosition(JAIL_POSITION, MAX_PLAYERS - 1, true)
    );
    expect(getTokenPosition(JAIL_POSITION, 99, false)).toEqual(
      getTokenPosition(JAIL_POSITION, MAX_PLAYERS - 1, false)
    );
  });
});

/**
 * Crowds are counted per region, or the first visitor takes the second slot of
 * a cluster they are not standing in.
 */
describe('tokenCrowdKey', () => {
  it('splits the two halves of the Jail square', () => {
    expect(tokenCrowdKey(JAIL_POSITION, true)).not.toBe(
      tokenCrowdKey(JAIL_POSITION, false)
    );
  });

  it('splits nothing anywhere else', () => {
    expect(tokenCrowdKey(7, true)).toBe(tokenCrowdKey(7, false));
    expect(tokenCrowdKey(0, true)).toBe(tokenCrowdKey(0, false));
  });
});
