import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveDirection } from '../../../domain/types/game.enums';
import type { PlayerState } from '../../../domain/types/game.interfaces';
import {
  TOKEN_MIN_STEP_INTERVAL_MS,
  TOKEN_STEP_INTERVAL_MS,
  TOKEN_WALK_BUDGET_MS,
} from '../diceDock.constants';
import { useAnimatedTokenPositions } from './useAnimatedTokenPositions';

const player = (
  id: string,
  position: number,
  lastMove: MoveDirection | null = null
): PlayerState => ({
  id,
  name: id,
  tokenId: 'elephant',
  cash: 1500,
  position,
  inJail: false,
  jailTurnsServed: 0,
  jailFreeCards: [],
  isBankrupt: false,
  bankruptcyRank: null,
  hasPassedGo: false,
  lastMove,
});

/** The pace the hook picks for a walk this long. Mirrors stepIntervalFor. */
const intervalFor = (steps: number) =>
  Math.max(
    TOKEN_MIN_STEP_INTERVAL_MS,
    Math.min(TOKEN_STEP_INTERVAL_MS, Math.round(TOKEN_WALK_BUDGET_MS / steps))
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const advanceOneStep = () => act(() => vi.advanceTimersByTime(TOKEN_STEP_INTERVAL_MS));

describe('useAnimatedTokenPositions', () => {
  it('starts at each player’s current space', () => {
    const { result } = renderHook(() => useAnimatedTokenPositions([player('a', 5)]));

    expect(result.current.positions).toEqual({ a: 5 });
  });

  // Regression: the effect depended on the players array, which is rebuilt every
  // render, so each animation step re-triggered it and stacked timers on the
  // pending ones - collapsing a seven-space walk into a single jump.
  it('walks one space per interval, not all at once', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0)] } }
    );

    rerender({ players: [player('a', 4)] });

    // Still at the start until the first tick.
    expect(result.current.positions.a).toBe(0);

    advanceOneStep();
    expect(result.current.positions.a).toBe(1);

    advanceOneStep();
    expect(result.current.positions.a).toBe(2);

    advanceOneStep();
    expect(result.current.positions.a).toBe(3);

    advanceOneStep();
    expect(result.current.positions.a).toBe(4);
  });

  it('ticks once per step', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    const { rerender } = renderHook(({ players }) => useAnimatedTokenPositions(players), {
      initialProps: { players: [player('a', 0)] },
    });

    rerender({ players: [player('a', 3)] });
    act(() => vi.advanceTimersByTime(TOKEN_STEP_INTERVAL_MS * 3));

    expect(play).toHaveBeenCalledTimes(3);
  });

  it('wraps past GO one space at a time', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 38)] } }
    );

    rerender({ players: [player('a', 1)] });

    advanceOneStep();
    expect(result.current.positions.a).toBe(39);
    advanceOneStep();
    expect(result.current.positions.a).toBe(0);
    advanceOneStep();
    expect(result.current.positions.a).toBe(1);
  });

  /**
   * The bug the user reported. This case used to assert the opposite - anything
   * past twelve spaces snapped - so "Advance to GO" teleported. Every move is
   * walked now, however far.
   */
  it('walks the whole way round for an advance to GO', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 1)] } }
    );

    rerender({ players: [player('a', 0, MoveDirection.Forward)] });

    const interval = intervalFor(39);
    expect(result.current.positions.a).toBe(1);

    act(() => vi.advanceTimersByTime(interval));
    expect(result.current.positions.a).toBe(2);

    // Part way round, still walking, nowhere near the destination.
    act(() => vi.advanceTimersByTime(interval * 18));
    expect(result.current.positions.a).toBe(20);
    expect(result.current.isMoving).toBe(true);

    act(() => vi.advanceTimersByTime(interval * 20));
    expect(result.current.positions.a).toBe(0);
  });

  // The direction comes from the engine, because the position change cannot
  // supply it: three back and thirty-seven forward end on the same square.
  it('walks a backward move backward', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 10)] } }
    );

    rerender({ players: [player('a', 7, MoveDirection.Backward)] });

    advanceOneStep();
    expect(result.current.positions.a).toBe(9);
    advanceOneStep();
    expect(result.current.positions.a).toBe(8);
    advanceOneStep();
    expect(result.current.positions.a).toBe(7);
  });

  it('wraps a backward move back past GO', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 1)] } }
    );

    rerender({ players: [player('a', 38, MoveDirection.Backward)] });

    advanceOneStep();
    expect(result.current.positions.a).toBe(0);
    advanceOneStep();
    expect(result.current.positions.a).toBe(39);
    advanceOneStep();
    expect(result.current.positions.a).toBe(38);
  });

  // A save written before the engine recorded direction, and a player who has
  // not moved yet. Forward is every ordinary move.
  it('treats a move with no recorded direction as forward', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0)] } }
    );

    rerender({ players: [player('a', 2, null)] });

    advanceOneStep();
    expect(result.current.positions.a).toBe(1);
  });

  /**
   * What the doubles complaint looked like. A second move arriving mid-walk used
   * to restart from the token's display position and cut both legs short; it
   * resumes from where the token actually is and still covers the ground.
   */
  it('resumes from where the token is when a second move arrives mid-walk', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0)] } }
    );

    rerender({ players: [player('a', 6, MoveDirection.Forward)] });
    advanceOneStep();
    advanceOneStep();
    expect(result.current.positions.a).toBe(2);

    // The engine has moved them on again before the first walk finished.
    rerender({ players: [player('a', 9, MoveDirection.Forward)] });

    advanceOneStep();
    expect(result.current.positions.a).toBe(3);
    act(() => vi.advanceTimersByTime(TOKEN_STEP_INTERVAL_MS * 6));
    expect(result.current.positions.a).toBe(9);
  });

  it('steps faster the further it has to go', () => {
    expect(intervalFor(4)).toBe(TOKEN_STEP_INTERVAL_MS);
    expect(intervalFor(39)).toBeLessThan(TOKEN_STEP_INTERVAL_MS);
    expect(intervalFor(39)).toBeGreaterThanOrEqual(TOKEN_MIN_STEP_INTERVAL_MS);
  });

  it('ticks on every step of a long walk, not just the short ones', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    const { rerender } = renderHook(({ players }) => useAnimatedTokenPositions(players), {
      initialProps: { players: [player('a', 1)] },
    });

    rerender({ players: [player('a', 0, MoveDirection.Forward)] });
    act(() => vi.advanceTimersByTime(intervalFor(39) * 40));

    expect(play).toHaveBeenCalledTimes(39);
  });

  it('moves each player independently', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0), player('b', 20)] } }
    );

    rerender({ players: [player('a', 2), player('b', 20)] });

    advanceOneStep();
    expect(result.current.positions).toEqual({ a: 1, b: 20 });
    advanceOneStep();
    expect(result.current.positions).toEqual({ a: 2, b: 20 });
  });

  // A re-render that changes nothing must not restart or duplicate the walk.
  it('ignores re-renders that do not change any position', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0)] } }
    );

    rerender({ players: [player('a', 3)] });
    advanceOneStep();
    expect(result.current.positions.a).toBe(1);

    // Same positions, new array identity.
    rerender({ players: [player('a', 3)] });
    advanceOneStep();

    expect(result.current.positions.a).toBe(2);
  });
});

describe('isMoving', () => {
  it('is false when nothing is walking', () => {
    const { result } = renderHook(() => useAnimatedTokenPositions([player('a', 5)]));

    expect(result.current.isMoving).toBe(false);
  });

  // The buy decision waits for this, so it must stay true for the whole walk.
  it('is true while a token walks and false once it lands', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0)] } }
    );

    rerender({ players: [player('a', 3)] });
    expect(result.current.isMoving).toBe(true);

    advanceOneStep();
    expect(result.current.isMoving).toBe(true);

    act(() => vi.advanceTimersByTime(TOKEN_STEP_INTERVAL_MS * 3));
    expect(result.current.isMoving).toBe(false);
  });

  // Go To Jail is a backward walk now, so it animates like anything else - and
  // the Roll button is gated on this, which is what stops a double being rolled
  // on top of a walk still in progress.
  it('is true while a token is taken back to Jail', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 30)] } }
    );

    rerender({ players: [player('a', 10, MoveDirection.Backward)] });

    expect(result.current.isMoving).toBe(true);
    expect(result.current.positions.a).toBe(30);

    act(() => vi.advanceTimersByTime(intervalFor(20) * 21));
    expect(result.current.positions.a).toBe(10);
    expect(result.current.isMoving).toBe(false);
  });

  it('stays false when a token appears with nowhere to walk from', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 5)] } }
    );

    rerender({ players: [player('a', 5), player('b', 22)] });

    expect(result.current.isMoving).toBe(false);
    expect(result.current.positions.b).toBe(22);
  });
});
