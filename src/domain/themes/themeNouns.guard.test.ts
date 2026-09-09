import { describe, expect, it } from 'vitest';
import { GENERIC_NOUNS } from './nouns.constants';
import { availableThemes } from './themes.registry';

/**
 * Every edition names the things on its board.
 *
 * The `SOUND_FOR_CUE` tactic: without this, a new edition ships with an
 * undefined noun and the booklet renders "four houses on each undefined"
 * rather than failing.
 */
describe('every edition', () => {
  it.each(availableThemes.map((theme) => theme.id))(
    'gives %s a vocabulary',
    (themeId) => {
      const theme = availableThemes.find((entry) => entry.id === themeId)!;

      for (const key of Object.keys(GENERIC_NOUNS) as (keyof typeof GENERIC_NOUNS)[]) {
        expect(theme.nouns[key], `${themeId} has no ${key}`).toBeTruthy();
      }
    }
  );

  // Lower case, because the booklet interpolates them mid-sentence.
  it.each(availableThemes.map((theme) => theme.id))(
    'keeps %s lower case for mid-sentence use',
    (themeId) => {
      const theme = availableThemes.find((entry) => entry.id === themeId)!;

      for (const value of Object.values(theme.nouns)) {
        expect(value).toBe(value.toLowerCase());
      }
    }
  );

  /**
   * A plural that is the singular means one of the two was forgotten - "four
   * houses on each city" and "more city" both come from this map.
   */
  it.each(availableThemes.map((theme) => theme.id))(
    'gives %s a distinct plural',
    (themeId) => {
      const theme = availableThemes.find((entry) => entry.id === themeId)!;

      expect(theme.nouns.sites).not.toBe(theme.nouns.site);
      expect(theme.nouns.railways).not.toBe(theme.nouns.railway);
    }
  );
});

describe('the generic vocabulary', () => {
  it('names nothing an edition owns', () => {
    // It stands in for all of them, so it must not be any of them.
    const editionSites = availableThemes.map((theme) => theme.nouns.site);
    expect(editionSites).not.toContain(GENERIC_NOUNS.site);
  });
});
