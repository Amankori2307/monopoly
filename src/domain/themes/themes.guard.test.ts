import { describe, expect, it } from 'vitest';
import {
  colorForId,
  PALETTE_FLOOR,
  PLAYER_COLORS,
  playerColorForIndex,
} from './playerColors.constants';
import { SpaceKind } from '../types/game.enums';
import { BOARD_LAYOUT } from './boardLayout.constants';
import { buildBoard } from './buildBoard.utils';
import { buildCards } from './buildCards.utils';
import { availableThemes, defaultTheme, getThemeOrDefault } from './themes.registry';

/**
 * Adding a theme is meant to be adding one file. These are what stop that file
 * being wrong in a way nobody notices until somebody is playing on it - the
 * same tactic as SOUND_FOR_CUE and the decision audience map.
 */

describe.each(availableThemes.map((theme) => [theme.id, theme] as const))(
  'the %s theme',
  (_id, theme) => {
    it('names every square on the board', () => {
      // A short list would leave a square called `undefined`, which renders as
      // an empty deed and is only noticed when somebody lands on it.
      expect(theme.spaceNames).toHaveLength(BOARD_LAYOUT.length);
      expect(theme.spaceNames.every((name) => name.trim().length > 0)).toBe(true);
    });

    it('gives every property a name of its own', () => {
      // Corners and card squares repeat by design - three Chance, two "Community
      // Chest" - but two *properties* sharing a name is unplayable: the deed
      // panel and the history both identify a square by what it is called.
      const propertyNames = BOARD_LAYOUT.map((square, index) => ({ square, index }))
        .filter(({ square }) =>
          [SpaceKind.Street, SpaceKind.Railway, SpaceKind.Utility].includes(square.kind)
        )
        .map(({ index }) => theme.spaceNames[index]);

      expect(new Set(propertyNames).size).toBe(propertyNames.length);
    });

    it('carries a currency symbol', () => {
      expect(theme.currencySymbol.trim().length).toBeGreaterThan(0);
    });

    it('builds a board that matches the shared layout square for square', () => {
      const board = buildBoard(theme);

      expect(board).toHaveLength(BOARD_LAYOUT.length);
      board.forEach((space, index) => {
        expect(space.kind).toBe(BOARD_LAYOUT[index].kind);
        expect(space.index).toBe(index);
        expect(space.id).toBe(`space-${index}`);
        expect(space.name).toBe(theme.spaceNames[index]);
      });
    });

    it("prints its own currency on its cards, not another edition's", () => {
      // The India deck used to hardcode DEFAULT_CURRENCY_SYMBOL, so a second
      // edition's cards would have promised rupees on a board priced in pounds.
      const cards = buildCards(theme);
      const withMoney = [...cards.chance, ...cards.communityChest].filter((card) =>
        /\d/.test(card.description)
      );

      expect(withMoney.length).toBeGreaterThan(0);
      withMoney.forEach((card) => {
        expect(card.description).toContain(theme.currencySymbol);
      });
    });

    it('names its own squares on its cards', () => {
      const cards = buildCards(theme);
      const advance = cards.chance.find((card) => card.id === 'chance-premium-street');

      expect(advance?.description).toContain(theme.spaceNames[37]);
    });
  }
);

describe('the registry', () => {
  it('has more than one theme, so the picker is not decoration', () => {
    expect(availableThemes.length).toBeGreaterThan(1);
  });

  it('gives every theme an id of its own', () => {
    // The id is also the `data-theme` attribute and the saved `themeId`, so a
    // duplicate would silently make one theme unreachable.
    const ids = availableThemes.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('finds a theme by id', () => {
    availableThemes.forEach((theme) => {
      expect(getThemeOrDefault(theme.id)).toBe(theme);
    });
  });

  it('falls back rather than throwing on an id it does not know', () => {
    // The id comes off a save: a game written by a build that had a theme this
    // one does not must still open.
    expect(getThemeOrDefault('a-theme-that-was-removed')).toBe(defaultTheme);
    expect(getThemeOrDefault('')).toBe(defaultTheme);
  });
});

/**
 * The palette, which no longer belongs to any edition.
 *
 * All four listed the same eight colours in the same order and differed only in
 * what they called the piece - and the piece was never drawn. These three used
 * to run once per theme; there is one list to check now.
 */
describe('the player palette', () => {
  it('seats a full table', () => {
    expect(PLAYER_COLORS.length).toBeGreaterThanOrEqual(PALETTE_FLOOR);
  });

  it('gives every player a colour of its own', () => {
    // A board piece is a plain coloured disc, so two players sharing a colour
    // are genuinely indistinguishable - there is no shape to fall back on.
    const colors = PLAYER_COLORS.map((entry) => entry.color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('gives every colour an id of its own', () => {
    // The ids are persisted on PlayerState.colorId, so a duplicate would make
    // two players' saves indistinguishable as well.
    const ids = PLAYER_COLORS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assigns a distinct colour to every seat at a full table', () => {
    const assigned = Array.from(
      { length: PALETTE_FLOOR },
      (_unused, index) => playerColorForIndex(index).id
    );
    expect(new Set(assigned).size).toBe(PALETTE_FLOOR);
  });

  it('falls back rather than resolving to no colour at all', () => {
    // An unknown id means a corrupt save. `backgroundColor: ''` is a piece you
    // cannot see, which is the documented failure this fallback exists for.
    expect(colorForId('not-a-colour')).toBe(PLAYER_COLORS[0].color);
    expect(colorForId(PLAYER_COLORS[3].id)).toBe(PLAYER_COLORS[3].color);
  });
});
