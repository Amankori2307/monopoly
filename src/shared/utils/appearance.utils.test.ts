import { describe, expect, it } from 'vitest';
import { APPEARANCES, EDITION_APPEARANCE } from '../constants/appearance.constants';
import { appearanceLabel, resolveAppearanceTheme } from './appearance.utils';

describe('resolveAppearanceTheme', () => {
  /**
   * `edition` is not a palette - there is no `[data-theme="edition"]` block -
   * so it has to resolve to the edition's own id. Getting this wrong puts a
   * value in data-theme that matches no palette, which is a game with no
   * colours at all rather than a game with the wrong ones.
   */
  it('falls back to the edition for the default appearance', () => {
    expect(resolveAppearanceTheme(EDITION_APPEARANCE, 'us-edition')).toBe('us-edition');
  });

  it('overrides the edition when an appearance is chosen', () => {
    expect(resolveAppearanceTheme('aesthetic', 'us-edition')).toBe('aesthetic');
  });

  // The point of an appearance rather than an edition: the colours change and
  // the board does not.
  it.each(['india-edition', 'international-edition', 'us-edition', 'world-edition'])(
    'recolours the %s board without replacing it',
    (editionId) => {
      expect(resolveAppearanceTheme('aesthetic', editionId)).toBe('aesthetic');
    }
  );
});

describe('appearanceLabel', () => {
  it('names every appearance', () => {
    for (const appearance of APPEARANCES) {
      expect(appearanceLabel(appearance.id)).toBe(appearance.label);
    }
  });
});
