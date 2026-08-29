import { describe, expect, it } from 'vitest';
import { BOARD_SIZE } from '../constants/game.constants';
import {
  getForwardSteps,
  getMovementPath,
  isWalkableMove,
  MAX_DICE_DISTANCE,
} from './tokenMovement.utils';

describe('getForwardSteps', () => {
  it('counts a simple forward move', () => {
    expect(getForwardSteps(3, 10)).toBe(7);
  });

  it('wraps past GO', () => {
    expect(getForwardSteps(38, 3)).toBe(5);
  });

  it('is zero for no move', () => {
    expect(getForwardSteps(12, 12)).toBe(0);
  });

  it('normalises out-of-range indexes', () => {
    expect(getForwardSteps(BOARD_SIZE + 3, 10)).toBe(7);
  });
});

describe('isWalkableMove', () => {
  it('walks a dice-sized hop', () => {
    expect(isWalkableMove(0, 7)).toBe(true);
    expect(isWalkableMove(0, MAX_DICE_DISTANCE)).toBe(true);
  });

  it('walks a hop that wraps past GO', () => {
    expect(isWalkableMove(38, 3)).toBe(true);
  });

  // Being sent to Jail or advanced to GO is a teleport, not a walk.
  it('does not walk a jump longer than the dice can reach', () => {
    expect(isWalkableMove(0, MAX_DICE_DISTANCE + 1)).toBe(false);
    expect(isWalkableMove(27, 10)).toBe(false);
  });

  it('does not walk a non-move', () => {
    expect(isWalkableMove(5, 5)).toBe(false);
  });
});

describe('getMovementPath', () => {
  it('lists each space passed through, excluding the start', () => {
    expect(getMovementPath(3, 7)).toEqual([4, 5, 6, 7]);
  });

  it('wraps past GO', () => {
    expect(getMovementPath(38, 2)).toEqual([39, 0, 1, 2]);
  });

  it('is empty when nothing moves', () => {
    expect(getMovementPath(9, 9)).toEqual([]);
  });

  it('always ends on the destination', () => {
    const path = getMovementPath(30, 5);
    expect(path[path.length - 1]).toBe(5);
    expect(path).toHaveLength(getForwardSteps(30, 5));
  });
});
