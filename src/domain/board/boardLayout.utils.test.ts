import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, CORNER_POSITIONS } from '../constants/game.constants';
import {
  BOARD_GRID_SIZE,
  boardIndexToGridPosition,
  getBoardCellCenter,
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
