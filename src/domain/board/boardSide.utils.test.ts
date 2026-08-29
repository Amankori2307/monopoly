import { describe, expect, it } from 'vitest';
import { BOARD_SIZE } from '../constants/game.constants';
import { BoardSide } from '../types/game.enums';
import { getBoardSide } from './boardSide.utils';

describe('getBoardSide', () => {
  it('puts each corner on the side it starts', () => {
    expect(getBoardSide(0)).toBe(BoardSide.Bottom);
    expect(getBoardSide(10)).toBe(BoardSide.Left);
    expect(getBoardSide(20)).toBe(BoardSide.Top);
    expect(getBoardSide(30)).toBe(BoardSide.Right);
  });

  it.each([
    [5, BoardSide.Bottom],
    [15, BoardSide.Left],
    [25, BoardSide.Top],
    [35, BoardSide.Right],
  ])('places index %i on the %s edge', (index, side) => {
    expect(getBoardSide(index)).toBe(side);
  });

  it('gives each side exactly ten spaces', () => {
    const counts: Record<string, number> = {};
    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const side = getBoardSide(index);
      counts[side] = (counts[side] ?? 0) + 1;
    }

    expect(Object.values(counts)).toEqual([10, 10, 10, 10]);
    expect(Object.keys(counts)).toHaveLength(4);
  });

  it('wraps indexes outside the board', () => {
    expect(getBoardSide(BOARD_SIZE)).toBe(getBoardSide(0));
    expect(getBoardSide(-1)).toBe(getBoardSide(BOARD_SIZE - 1));
  });
});
