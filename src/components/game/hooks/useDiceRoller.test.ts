import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLog, getLogErrors } from '../../../shared/utils/logger.utils';
import { DICE_ROLL_DURATION_MS } from '../diceDock.constants';
import { useDiceRoller } from './useDiceRoller';

const options = (onRoll: () => void) => ({
  canRoll: true,
  lastRoll: null,
  onRoll,
  soundSrc: 'dice.wav',
});

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
  });

  it('rolls, then commits and settles', () => {
    const onRoll = vi.fn();
    const { result } = renderHook(() => useDiceRoller(options(onRoll)));

    act(() => result.current.roll());
    expect(result.current.isRolling).toBe(true);

    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(result.current.isRolling).toBe(false);
  });

  // Regression: the engine throws on an invalid command. When that reached the
  // commit callback the rolling flag was never cleared and the dock sat on
  // "Rolling..." forever, with the roll button permanently disabled.
  it('stops rolling even when onRoll throws', () => {
    const onRoll = vi.fn(() => {
      throw new Error('Player must choose a Jail action first.');
    });
    const { result } = renderHook(() => useDiceRoller(options(onRoll)));

    act(() => result.current.roll());

    // The throw is contained, not rethrown - letting it escape stops React
    // committing the reset below, which is what stranded the dock.
    expect(() => act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS))).not.toThrow();

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(result.current.isRolling).toBe(false);
  });

  it('logs the failure rather than swallowing it silently', () => {
    const onRoll = vi.fn(() => {
      throw new Error('Rolling is not available right now.');
    });
    const { result } = renderHook(() => useDiceRoller(options(onRoll)));

    act(() => result.current.roll());
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(
      getLogErrors().some((entry) => entry.message.includes('roll handler threw'))
    ).toBe(true);
  });

  it('ignores a roll while already rolling', () => {
    const onRoll = vi.fn();
    const { result } = renderHook(() => useDiceRoller(options(onRoll)));

    act(() => result.current.roll());
    act(() => result.current.roll());
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it('ignores a roll when rolling is not allowed', () => {
    const onRoll = vi.fn();
    const { result } = renderHook(() =>
      useDiceRoller({ ...options(onRoll), canRoll: false })
    );

    act(() => result.current.roll());
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(onRoll).not.toHaveBeenCalled();
    expect(result.current.isRolling).toBe(false);
  });

  it('shows the engine roll once it settles', () => {
    const { rerender, result } = renderHook(
      ({ lastRoll }) => useDiceRoller({ ...options(vi.fn()), lastRoll }),
      { initialProps: { lastRoll: null as number[] | null } }
    );

    rerender({ lastRoll: [3, 5] });

    expect(result.current.displayValues).toEqual([3, 5]);
  });
});

/**
 * The sound is decoration. It must never be able to stop the roll.
 */
describe('when the browser will not play the sound', () => {
  // `play()` does not return a promise everywhere - jsdom returns undefined,
  // and so did older Safari - so `.catch()` on it threw out of the roll handler
  // before either timer was set, and the click did nothing at all.
  it('still rolls when play() returns no promise', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(
      () => undefined as unknown as Promise<void>
    );
    const onRoll = vi.fn();
    const { result } = renderHook(() =>
      useDiceRoller({ canRoll: true, lastRoll: null, onRoll, soundSrc: 'dice.wav' })
    );

    act(() => result.current.roll());
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(onRoll).toHaveBeenCalledOnce();
  });

  it('still rolls when play() throws outright', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => {
      throw new Error('NotAllowedError');
    });
    const onRoll = vi.fn();
    const { result } = renderHook(() =>
      useDiceRoller({ canRoll: true, lastRoll: null, onRoll, soundSrc: 'dice.wav' })
    );

    act(() => result.current.roll());
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(onRoll).toHaveBeenCalledOnce();
  });

  it('still rolls when play() rejects', async () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(
      new Error('NotAllowedError')
    );
    const onRoll = vi.fn();
    const { result } = renderHook(() =>
      useDiceRoller({ canRoll: true, lastRoll: null, onRoll, soundSrc: 'dice.wav' })
    );

    act(() => result.current.roll());
    act(() => vi.advanceTimersByTime(DICE_ROLL_DURATION_MS));

    expect(onRoll).toHaveBeenCalledOnce();
  });
});
