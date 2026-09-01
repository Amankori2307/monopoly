import { describe, expect, it } from 'vitest';
import { BOARD_SIZE } from '../constants/game.constants';
import { MoveDirection } from '../types/game.enums';
import {
  getBackwardSteps,
  getForwardSteps,
  getMovementPath,
  getMovementSteps,
} from './tokenMovement.utils';

describe('getForwardSteps', () => {
  it('counts the spaces between two indices', () => {
    expect(getForwardSteps(3, 10)).toBe(7);
  });

  it('wraps past GO', () => {
    expect(getForwardSteps(38, 3)).toBe(5);
  });

  it('is zero for a move that goes nowhere', () => {
    expect(getForwardSteps(12, 12)).toBe(0);
  });

  it('normalises an index past the end of the board', () => {
    expect(getForwardSteps(BOARD_SIZE + 3, 10)).toBe(7);
  });
});

describe('getBackwardSteps', () => {
  it('counts the spaces back between two indices', () => {
    expect(getBackwardSteps(10, 7)).toBe(3);
  });

  it('wraps back past GO', () => {
    expect(getBackwardSteps(3, 38)).toBe(5);
  });

  // The pair of them is what the direction argument exists for: three back and
  // thirty-seven forward land on the same square.
  it('is the complement of the forward count', () => {
    expect(getForwardSteps(10, 7) + getBackwardSteps(10, 7)).toBe(BOARD_SIZE);
  });
});

describe('getMovementSteps', () => {
  it('counts a move the way it was actually travelled', () => {
    expect(getMovementSteps(10, 7, MoveDirection.Backward)).toBe(3);
    expect(getMovementSteps(10, 7, MoveDirection.Forward)).toBe(37);
  });
});

describe('getMovementPath', () => {
  it('lists the spaces walked, excluding where it started', () => {
    expect(getMovementPath(3, 7, MoveDirection.Forward)).toEqual([4, 5, 6, 7]);
  });

  it('wraps forward past GO', () => {
    expect(getMovementPath(38, 2, MoveDirection.Forward)).toEqual([39, 0, 1, 2]);
  });

  it('walks a backward move backward', () => {
    expect(getMovementPath(10, 7, MoveDirection.Backward)).toEqual([9, 8, 7]);
  });

  it('wraps a backward move back past GO', () => {
    expect(getMovementPath(2, 38, MoveDirection.Backward)).toEqual([1, 0, 39, 38]);
  });

  it('is empty when the token does not move', () => {
    expect(getMovementPath(9, 9, MoveDirection.Forward)).toEqual([]);
  });

  /**
   * The cap this replaced snapped anything past a dice roll, so "Advance to GO"
   * teleported. There is no limit now: a card can send a token the whole way
   * round and every space of it is walked.
   */
  it('walks the whole way round for a long advance', () => {
    const path = getMovementPath(1, 0, MoveDirection.Forward);

    expect(path).toHaveLength(BOARD_SIZE - 1);
    expect(path[0]).toBe(2);
    expect(path.at(-1)).toBe(0);
  });

  it('ends on the destination, whichever way it went', () => {
    expect(getMovementPath(30, 5, MoveDirection.Forward).at(-1)).toBe(5);
    expect(getMovementPath(30, 5, MoveDirection.Backward).at(-1)).toBe(5);
  });

  it('never leaves the board', () => {
    const path = [
      ...getMovementPath(38, 4, MoveDirection.Forward),
      ...getMovementPath(2, 36, MoveDirection.Backward),
    ];

    expect(path.every((space) => space >= 0 && space < BOARD_SIZE)).toBe(true);
  });
});
