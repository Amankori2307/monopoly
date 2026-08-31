import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, CORNER_POSITIONS, MAX_PLAYERS } from '../constants/game.constants';
import {
  BOARD_GRID_SIZE,
  boardIndexToGridPosition,
  getBoardCellCenter,
  getTokenCrowdOffset,
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
