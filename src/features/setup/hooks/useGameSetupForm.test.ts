import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../../domain/constants/game.constants';
import { availableThemes, defaultTheme } from '../../../domain/themes/themes.registry';
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
 * Every player must hold a piece the chosen edition actually has.
 *
 * The token defaults read India's catalog whatever edition was selected, and
 * the effect that rebuilt them keyed on the player count alone - so switching
 * edition left ids like `elephant`, which exist in no other catalog. The token
 * finder returned undefined and every player rendered as a colourless,
 * emoji-less disc, on a board where colour is the only thing telling them
 * apart.
 */
describe('the tokens each edition offers', () => {
  const otherEditions = availableThemes.filter((theme) => theme.id !== defaultTheme.id);

  it('starts everybody on a piece the default edition has', () => {
    const { result } = renderHook(() => useGameSetupForm());

    for (const tokenId of result.current.playerTokens) {
      expect(defaultTheme.tokenCatalog.map((token) => token.id)).toContain(tokenId);
    }
  });

  it.each(otherEditions.map((theme) => theme.id))(
    'moves everybody onto a piece %s has',
    (themeId) => {
      const { result } = renderHook(() => useGameSetupForm());

      act(() => result.current.setThemeId(themeId));

      const catalog = availableThemes
        .find((theme) => theme.id === themeId)!
        .tokenCatalog.map((token) => token.id);
      expect(result.current.playerTokens).toHaveLength(result.current.playerCount);
      for (const tokenId of result.current.playerTokens) {
        expect(catalog).toContain(tokenId);
      }
    }
  );

  it('gives no two players the same piece', () => {
    const { result } = renderHook(() => useGameSetupForm());

    act(() => result.current.setPlayerCount(MAX_PLAYERS));

    expect(new Set(result.current.playerTokens).size).toBe(MAX_PLAYERS);
  });

  // A deliberate pick must survive a count change, so only pieces the edition
  // lacks are replaced.
  it('keeps a piece the player chose themselves', () => {
    const { result } = renderHook(() => useGameSetupForm());
    const chosen = defaultTheme.tokenCatalog[3].id;

    act(() => result.current.setPlayerToken(0, chosen));
    act(() => result.current.setPlayerCount(4));

    expect(result.current.playerTokens[0]).toBe(chosen);
  });
});
