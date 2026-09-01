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

  /**
   * The burst this replaced. Every step timer used to be queued at once, so the
   * main-thread stall right after a command - engine, validated save, whole board
   * re-render - left six of them overdue and they all fired in the same
   * millisecond: the token jumped six spaces and six taks stacked into one noise.
   * A chained timer cannot compress, because the next one does not exist until
   * the previous has run.
   */
  it('does not fire a burst of steps after a stall', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0)] } }
    );

    rerender({ players: [player('a', 8, MoveDirection.Forward)] });

    // Two pending timers - the walk's next tick and the watchdog - not one per
    // step. That is the property, and it is what fake timers can actually see:
    // they run due timers in order, so they cannot simulate the stall itself. A
    // walk that is not queued up front cannot come due all at once, however long
    // the main thread blocks.
    expect(vi.getTimerCount()).toBeLessThanOrEqual(2);

    act(() => vi.advanceTimersByTime(TOKEN_STEP_INTERVAL_MS * 6));

    expect(result.current.positions.a).toBe(6);
    expect(play).toHaveBeenCalledTimes(6);
    expect(vi.getTimerCount()).toBeLessThanOrEqual(2);
  });

  /**
   * A backgrounded tab throttles timers to about one a second. Chaining a step
   * off each callback turned a thirty-nine step walk into a thirty-nine second
   * one, with the Roll button disabled and every decision withheld throughout -
   * which reads as the game being stuck. Position comes off the clock, so a late
   * tick catches up instead.
   */
  it('catches up in one tick when timers are throttled', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0)] } }
    );

    rerender({ players: [player('a', 10, MoveDirection.Forward)] });

    // A whole second passes with only one tick's worth of callbacks running,
    // which is what throttling looks like.
    act(() => vi.advanceTimersByTime(TOKEN_STEP_INTERVAL_MS * 5.5));

    // Five spaces covered, and one tak per tick rather than five at once.
    expect(result.current.positions.a).toBe(5);
    expect(play.mock.calls.length).toBeLessThanOrEqual(5);
    expect(result.current.isMoving).toBe(true);
  });

  /**
   * The last resort, because a walk that never ends is a game that cannot be
   * played: isMoving gates the Roll button and withholds every decision modal,
   * so a token stuck mid-walk leaves the player with nothing to click and
   * nothing on screen saying why.
   */
  it('always settles, and puts the token where the engine says it is', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 1)] } }
    );

    rerender({ players: [player('a', 0, MoveDirection.Forward)] });

    // Well past anything a thirty-nine step walk plus the watchdog's slack can
    // take, whatever happened to the timers in between.
    act(() => vi.advanceTimersByTime(TOKEN_WALK_BUDGET_MS + 30_000));

    expect(result.current.isMoving).toBe(false);
    expect(result.current.positions.a).toBe(0);
  });

  it('never leaves isMoving true after any move, in either direction', () => {
    const moves: Array<[number, number, MoveDirection]> = [
      [0, 7, MoveDirection.Forward],
      [1, 0, MoveDirection.Forward],
      [10, 7, MoveDirection.Backward],
      [7, 10, MoveDirection.Backward],
      [2, 38, MoveDirection.Backward],
      [38, 2, MoveDirection.Forward],
    ];

    moves.forEach(([from, to, direction]) => {
      const { rerender, result, unmount } = renderHook(
        ({ players }) => useAnimatedTokenPositions(players),
        { initialProps: { players: [player('a', from)] } }
      );

      rerender({ players: [player('a', to, direction)] });
      act(() => vi.advanceTimersByTime(TOKEN_WALK_BUDGET_MS + 30_000));

      expect(result.current.isMoving, `${from} -> ${to} ${direction}`).toBe(false);
      expect(result.current.positions.a, `${from} -> ${to} ${direction}`).toBe(to);
      unmount();
    });
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
