import { describe, expect, it } from 'vitest';
import { APPEARANCES, EDITION_APPEARANCE } from '../constants/appearance.constants';
import {
  appearanceLabel,
  nextAppearance,
  resolveAppearanceTheme,
} from './appearance.utils';

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

describe('nextAppearance', () => {
  it('wraps round the list', () => {
    const ids = APPEARANCES.map((appearance) => appearance.id);
    const walked = ids.map((_, index) =>
      ids.slice(0, index + 1).reduce((current) => nextAppearance(current), ids[0])
    );

    // Walking the list once from the first entry returns to the first entry.
    expect(walked[walked.length - 1]).toBe(ids[0]);
  });

  it('never returns the appearance it was given', () => {
    // True only while there is more than one, which is the case worth guarding:
    // a cycle that returns its input is a control that does nothing.
    expect(APPEARANCES.length).toBeGreaterThan(1);
    for (const appearance of APPEARANCES) {
      expect(nextAppearance(appearance.id)).not.toBe(appearance.id);
    }
  });
});

describe('appearanceLabel', () => {
  it('names every appearance', () => {
    for (const appearance of APPEARANCES) {
      expect(appearanceLabel(appearance.id)).toBe(appearance.label);
    }
  });
});
