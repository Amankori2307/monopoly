import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../../domain/constants/game.constants';
import { useGameSetupForm } from './useGameSetupForm';

/**
 * The player count used to clamp in silence, which read as the input ignoring
 * the keyboard rather than as a rule.
 */
describe('the player count', () => {
  it('says so when a number above the maximum is pulled back', () => {
    const { result } = renderHook(() => useGameSetupForm());

    act(() => result.current.setPlayerCount(12));

    expect(result.current.playerCount).toBe(MAX_PLAYERS);
    expect(result.current.playerCountNotice).toMatch(
      new RegExp(`${MIN_PLAYERS} to ${MAX_PLAYERS}`)
    );
  });

  it('says so when a number below the minimum is pulled up', () => {
    const { result } = renderHook(() => useGameSetupForm());

    act(() => result.current.setPlayerCount(1));

    expect(result.current.playerCount).toBe(MIN_PLAYERS);
    expect(result.current.playerCountNotice).not.toBeNull();
  });

  it('says nothing when the number was already allowed', () => {
    const { result } = renderHook(() => useGameSetupForm());

    act(() => result.current.setPlayerCount(4));

    expect(result.current.playerCount).toBe(4);
    expect(result.current.playerCountNotice).toBeNull();
  });

  it('clears the notice once an allowed number is typed', () => {
    const { result } = renderHook(() => useGameSetupForm());

    act(() => result.current.setPlayerCount(99));
    act(() => result.current.setPlayerCount(3));

    expect(result.current.playerCountNotice).toBeNull();
  });

  // An empty input arrives as NaN, which is not a rejected number - it is no
  // number at all, and should not be reported as one.
  it('says nothing for an empty input', () => {
    const { result } = renderHook(() => useGameSetupForm());

    act(() => result.current.setPlayerCount(Number.NaN));

    expect(result.current.playerCountNotice).toBeNull();
  });
});

describe('the Speed Die setting', () => {
  it('starts off and can be turned on', () => {
    const { result } = renderHook(() => useGameSetupForm());

    expect(result.current.useSpeedDie).toBe(false);
    act(() => result.current.setUseSpeedDie(true));
    expect(result.current.useSpeedDie).toBe(true);
  });
});

/**
 * A colour is no longer a choice, so there is nothing here to test.
 *
 * This file held four tests about the token catalog: that everybody started on
 * a piece the default edition had, that switching edition moved everybody onto
 * a piece THAT edition had, that no two players shared one, and that a
 * deliberate pick survived a count change. Every one of them was guarding a
 * decision the form no longer makes - the engine assigns a colour by creation
 * order from a single palette, so "a piece this edition does not have" cannot
 * happen and two players sharing one is unrepresentable.
 *
 * What replaced them lives in domain/themes/themes.guard.test.ts, on the
 * palette itself: eight distinct colours, eight distinct ids, and a distinct
 * colour for every seat at a full table.
 */
