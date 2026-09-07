import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLog, getLogErrors } from '../../../shared/utils/logger.utils';
import { DICE_ROLL_DURATION_MS, DICE_SUBMIT_WATCHDOG_MS } from '../diceDock.constants';
import { useDiceRoller } from './useDiceRoller';

/**
 * The tumble runs AFTER the commit now. The click tells the engine, the engine
 * decides the throw and stamps `turn.lastRollId`, and every device animates
 * that id exactly once - the roller and the watchers alike.
 */

const options = (onRoll: () => void, lastRollId: string | null = null) => ({
  canRoll: true,
  lastRoll: null as number[] | null,
  lastRollId,
  onRoll,
  soundSrc: 'dice.wav',
});

/** Renders the hook so the roll id can be changed the way the engine would. */
const renderRoller = (onRoll: () => void = vi.fn()) =>
  renderHook(
    ({
      lastRollId,
      lastRoll,
    }: {
      lastRollId: string | null;
      lastRoll: number[] | null;
    }) => useDiceRoller({ ...options(onRoll), lastRollId, lastRoll }),
    {
      initialProps: {
        lastRollId: null as string | null,
        lastRoll: null as number[] | null,
      },
    }
  );

beforeEach(() => {
  clearLog();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.useFakeTimers();
  // jsdom has no audio pipeline; play() would reject unhandled.
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useDiceRoller', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useDiceRoller(options(vi.fn())));

    expect(result.current.isRolling).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('tells the engine synchronously, before any animation', () => {
    const onRoll = vi.fn();
    const { result } = renderRoller(onRoll);

    act(() => result.current.roll());

    // The whole point of the change: the engine hears about it immediately,
    // rather than 520ms of animation later.
    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);
    expect(result.current.isRolling).toBe(false);
  });

  it('tumbles when a new roll id arrives, then settles on the engine values', () => {
    const { result, rerender } = renderRoller();

    act(() => result.current.roll());
    act(() => rerender({ lastRollId: 'roll-1', lastRoll: [4, 2] }));

    expect(result.current.isRolling).toBe(true);
    // The lock releases as soon as our command lands; the animation continues.
    expect(result.current.isSubmitting).toBe(false);

    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(result.current.isRolling).toBe(false);
    expect(result.current.displayValues).toEqual([4, 2]);
  });

  it('tumbles on a device that did not click, which is the point', () => {
    const onRoll = vi.fn();
    const { result, rerender } = renderRoller(onRoll);

    // No roll() here: this is somebody else's throw arriving over the wire.
    act(() => rerender({ lastRollId: 'roll-1', lastRoll: [6, 1] }));

    expect(result.current.isRolling).toBe(true);
    expect(onRoll).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));
    expect(result.current.displayValues).toEqual([6, 1]);
  });

  it('does not tumble for a throw that was already on screen when it mounted', () => {
    // Opening a saved game mid-turn must not replay a roll from before the page
    // was loaded.
    const { result } = renderHook(() =>
      useDiceRoller({ ...options(vi.fn(), 'roll-from-the-save'), lastRoll: [3, 3] })
    );

    expect(result.current.isRolling).toBe(false);
    expect(result.current.displayValues).toEqual([3, 3]);
  });

  it('does not re-tumble when the id has not changed', () => {
    const { result, rerender } = renderRoller();

    act(() => rerender({ lastRollId: 'roll-1', lastRoll: [4, 2] }));
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    // An unrelated command re-renders with the same roll id. Deriving the id
    // from history[0].id instead would have re-tumbled here on every move.
    act(() => rerender({ lastRollId: 'roll-1', lastRoll: [4, 2] }));

    expect(result.current.isRolling).toBe(false);
  });

  it('releases the lock even when nothing ever lands', () => {
    // A refused command, or a publish that never answers. Without the watchdog
    // the button would sit disabled on "Rolling..." forever - the dead end this
    // dock has already been fixed for once.
    const { result } = renderRoller();

    act(() => result.current.roll());
    expect(result.current.isSubmitting).toBe(true);

    act(() => vi.advanceTimersByTime(DICE_SUBMIT_WATCHDOG_MS));

    expect(result.current.isSubmitting).toBe(false);
  });

  it('releases the lock when onRoll throws, and says why', () => {
    const { result } = renderRoller(() => {
      throw new Error('rolling is not allowed right now');
    });

    act(() => result.current.roll());

    expect(result.current.isSubmitting).toBe(false);
    expect(getLogErrors().some((entry) => /roll handler threw/.test(entry.message))).toBe(
      true
    );
  });

  it('ignores a second click while the first is in flight', () => {
    const onRoll = vi.fn();
    const { result } = renderRoller(onRoll);

    act(() => result.current.roll());
    act(() => result.current.roll());

    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it('ignores a click while the faces are still tumbling', () => {
    const onRoll = vi.fn();
    const { result, rerender } = renderRoller(onRoll);

    act(() => rerender({ lastRollId: 'roll-1', lastRoll: [2, 2] }));
    act(() => result.current.roll());

    expect(onRoll).not.toHaveBeenCalled();
  });

  it('ignores a roll when rolling is not allowed', () => {
    const onRoll = vi.fn();
    const { result } = renderHook(() =>
      useDiceRoller({ ...options(onRoll), canRoll: false })
    );

    act(() => result.current.roll());

    expect(onRoll).not.toHaveBeenCalled();
  });

  it.each([
    ['returns no promise', () => undefined],
    [
      'throws outright',
      () => {
        throw new Error('NotAllowedError');
      },
    ],
    ['rejects', () => Promise.reject(new Error('NotAllowedError'))],
  ])('still animates when play() %s', (_label, play) => {
    // The sound is decoration and must never be able to stop a roll. play()
    // does not return a promise everywhere, so `.catch()` on it threw
    // synchronously and the click did nothing at all.
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(
      play as () => Promise<void>
    );
    const { result, rerender } = renderRoller();

    act(() => rerender({ lastRollId: 'roll-1', lastRoll: [5, 5] }));

    expect(result.current.isRolling).toBe(true);
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));
    expect(result.current.displayValues).toEqual([5, 5]);
  });
});
