import { afterEach, describe, expect, it, vi } from 'vitest';
import { EDITION_APPEARANCE } from '../../shared/constants/appearance.constants';
import {
  APPEARANCE_PREFERENCE_KEY,
  readAppearancePreference,
  writeAppearancePreference,
} from './appearancePreference.utils';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('the appearance preference', () => {
  it('defaults to following the edition', () => {
    expect(readAppearancePreference()).toBe(EDITION_APPEARANCE);
  });

  it('round-trips a chosen appearance', () => {
    writeAppearancePreference('aesthetic');

    expect(localStorage.getItem(APPEARANCE_PREFERENCE_KEY)).toBe('aesthetic');
    expect(readAppearancePreference()).toBe('aesthetic');
  });

  /**
   * The stored value is whatever is on the disk of a browser that may have run
   * an older build. An unknown id would reach `data-theme` and match no palette
   * at all - not the wrong colours, no colours.
   */
  it('ignores an id it does not recognise', () => {
    localStorage.setItem(APPEARANCE_PREFERENCE_KEY, 'a-theme-that-was-removed');

    expect(readAppearancePreference()).toBe(EDITION_APPEARANCE);
  });

  // A private window throws on any write, and a browser with storage blocked
  // throws on the read too. Neither may take the game down with it.
  it('falls back when the read throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(readAppearancePreference()).toBe(EDITION_APPEARANCE);
  });

  it('swallows a failed write', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(() => writeAppearancePreference('aesthetic')).not.toThrow();
  });
});
