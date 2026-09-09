import { describe, expect, it } from 'vitest';
import { GENERIC_NOUNS } from './nouns.constants';
import { countSites, nounsFor } from './nouns.utils';
import { availableThemes, defaultTheme } from './themes.registry';
import { indiaTheme } from './india.theme';
import { usTheme } from './us.theme';

describe('nounsFor', () => {
  it('gives each edition its own words', () => {
    expect(nounsFor(indiaTheme.id).sites).toBe('cities');
    expect(nounsFor(usTheme.id).sites).toBe('streets');
  });

  it('falls back to the default edition for an unknown theme id', () => {
    expect(nounsFor('no-such-edition')).toEqual(defaultTheme.nouns);
  });

  it('is never the generic vocabulary, which belongs to the booklet alone', () => {
    // GENERIC_NOUNS exists for the rules page read with no game open. An
    // engine message always has a game, so reaching for it here would mean a
    // player on the India board being told about "properties".
    availableThemes.forEach((theme) =>
      expect(theme.nouns.site).not.toBe(GENERIC_NOUNS.site)
    );
  });
});

describe('countSites', () => {
  it('counts in the edition it is given', () => {
    expect(countSites(indiaTheme.id, 3)).toBe('3 cities');
    expect(countSites(usTheme.id, 3)).toBe('3 streets');
  });

  it('says one of a thing in the singular', () => {
    // This is the whole reason it exists: the bankruptcy messages said
    // "1 site(s)" at the most dramatic moment in a game.
    expect(countSites(indiaTheme.id, 1)).toBe('1 city');
    expect(countSites(usTheme.id, 1)).toBe('1 street');
  });

  it('treats zero as a plural, as English does', () => {
    expect(countSites(indiaTheme.id, 0)).toBe('0 cities');
  });
});
