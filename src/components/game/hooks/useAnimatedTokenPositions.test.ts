import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerState } from '../../../domain/types/game.interfaces';
import { TOKEN_STEP_INTERVAL_MS } from '../diceDock.constants';
import { useAnimatedTokenPositions } from './useAnimatedTokenPositions';

const player = (id: string, position: number): PlayerState => ({
  id,
  name: id,
  tokenId: 'elephant',
  cash: 1500,
  position,
  inJail: false,
  jailTurnsServed: 0,
  jailFreeCards: 0,
  isBankrupt: false,
  bankruptcyRank: null,
});

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

    expect(result.current).toEqual({ a: 5 });
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
    expect(result.current.a).toBe(0);

    advanceOneStep();
    expect(result.current.a).toBe(1);

    advanceOneStep();
    expect(result.current.a).toBe(2);

    advanceOneStep();
    expect(result.current.a).toBe(3);

    advanceOneStep();
    expect(result.current.a).toBe(4);
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
    expect(result.current.a).toBe(39);
    advanceOneStep();
    expect(result.current.a).toBe(0);
    advanceOneStep();
    expect(result.current.a).toBe(1);
  });

  // Go To Jail and card teleports must not be walked.
  it('snaps a move longer than the dice can reach', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 27)] } }
    );

    rerender({ players: [player('a', 10)] });

    expect(result.current.a).toBe(10);
  });

  it('moves each player independently', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0), player('b', 20)] } }
    );

    rerender({ players: [player('a', 2), player('b', 20)] });

    advanceOneStep();
    expect(result.current).toEqual({ a: 1, b: 20 });
    advanceOneStep();
    expect(result.current).toEqual({ a: 2, b: 20 });
  });

  // A re-render that changes nothing must not restart or duplicate the walk.
  it('ignores re-renders that do not change any position', () => {
    const { rerender, result } = renderHook(
      ({ players }) => useAnimatedTokenPositions(players),
      { initialProps: { players: [player('a', 0)] } }
    );

    rerender({ players: [player('a', 3)] });
    advanceOneStep();
    expect(result.current.a).toBe(1);

    // Same positions, new array identity.
    rerender({ players: [player('a', 3)] });
    advanceOneStep();

    expect(result.current.a).toBe(2);
  });
});
