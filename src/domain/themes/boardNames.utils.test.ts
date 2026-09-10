import { describe, expect, it } from 'vitest';
import { SpaceKind } from '../types/game.enums';
import { buildBoard } from './buildBoard.utils';
import { availableThemes } from './themes.registry';
import { boardPriceOf, boardShortName } from './boardNames.utils';

describe('boardPriceOf', () => {
  const board = buildBoard(availableThemes[0]);

  it('prints the price of every square a player can buy', () => {
    const ownable = board.filter((space) =>
      [SpaceKind.Street, SpaceKind.Railway, SpaceKind.Utility].includes(space.kind)
    );
    // 22 streets, 4 railways, 2 utilities - the whole ownable board.
    expect(ownable).toHaveLength(28);
    ownable.forEach((space) => {
      expect(boardPriceOf(space)).toBeGreaterThan(0);
    });
  });

  it('prints what a tax square charges, which is not a price', () => {
    const taxes = board.filter((space) => space.kind === SpaceKind.Tax);
    expect(taxes).toHaveLength(2);
    taxes.forEach((space) => {
      expect(boardPriceOf(space)).toBeGreaterThan(0);
    });
  });

  it('prints nothing on a square with no fixed amount', () => {
    const silent = board.filter((space) =>
      [
        SpaceKind.Go,
        SpaceKind.Jail,
        SpaceKind.FreeParking,
        SpaceKind.GoToJail,
        SpaceKind.Chance,
        SpaceKind.CommunityChest,
      ].includes(space.kind)
    );
    expect(silent.length).toBeGreaterThan(0);
    silent.forEach((space) => {
      expect(boardPriceOf(space)).toBeNull();
    });
  });
});

describe('boardShortName', () => {
  // Every edition, because the railway word is the whole point: a board of
  // stations must not be told it holds railway stations.
  availableThemes.forEach((theme) => {
    const board = buildBoard(theme);

    it(`calls a railway what the ${theme.id} board calls one`, () => {
      const railways = board.filter((space) => space.kind === SpaceKind.Railway);
      expect(railways).toHaveLength(4);
      railways.forEach((space) => {
        expect(boardShortName(space, theme.id)).toBe(theme.nouns.railway);
      });
    });

    it(`tells the two ${theme.id} utilities apart`, () => {
      const utilities = board.filter((space) => space.kind === SpaceKind.Utility);
      expect(utilities).toHaveLength(2);
      const shortNames = utilities.map((space) => boardShortName(space, theme.id));
      expect(
        shortNames.every((name) => typeof name === 'string' && name.length > 0)
      ).toBe(true);
      // Two squares sharing a label would make the compact board unreadable.
      expect(new Set(shortNames).size).toBe(2);
    });

    it(`leaves every other ${theme.id} square its own name`, () => {
      const others = board.filter(
        (space) => space.kind !== SpaceKind.Railway && space.kind !== SpaceKind.Utility
      );
      others.forEach((space) => {
        expect(boardShortName(space, theme.id)).toBeNull();
      });
    });
  });

  it('is shorter than the name it replaces, or there was no point', () => {
    availableThemes.forEach((theme) => {
      buildBoard(theme)
        .filter((space) => space.kind === SpaceKind.Railway)
        .forEach((space) => {
          const short = boardShortName(space, theme.id);
          expect(short && short.length).toBeLessThan(space.name.length);
        });
    });
  });
});

/**
 * The claim the board's type ramp is sized against.
 *
 * A square fits three wrapped lines of name beside a price at the smallest
 * board this app supports. Streets stay inside that; the six squares
 * `boardShortName` covers are the ones that do not. If a future edition adds a
 * four-word street, or a single word longer than the line, the board will clip
 * silently - a square is `overflow: hidden`, so there is nothing to see. This
 * fails instead, and names the square.
 *
 * Fourteen characters is the longest word that still sets in one line on a
 * 296px board: "Northumberland" at 9.81em against a 28.58px line at 5px type.
 */
describe('the line budget every board name has to fit', () => {
  const MAX_WORDS = 3;
  const MAX_WORD_LENGTH = 14;

  availableThemes.forEach((theme) => {
    it(`keeps every ${theme.id} street inside three lines`, () => {
      const offenders = buildBoard(theme)
        .filter((space) => space.kind === SpaceKind.Street)
        .filter((space) => {
          const words = space.name.split(/[\s-]+/);
          return (
            words.length > MAX_WORDS ||
            words.some((word) => word.length > MAX_WORD_LENGTH)
          );
        })
        .map((space) => space.name);

      expect(offenders).toEqual([]);
    });

    it(`gives every long ${theme.id} square a short name, and no others`, () => {
      const withShortName = buildBoard(theme)
        .filter((space) => boardShortName(space, theme.id) !== null)
        .map((space) => space.kind);

      // Exactly the four railways and the two utilities. Anything else here
      // means a square is being renamed that did not need it.
      expect(withShortName.filter((kind) => kind === SpaceKind.Railway)).toHaveLength(4);
      expect(withShortName.filter((kind) => kind === SpaceKind.Utility)).toHaveLength(2);
      expect(withShortName).toHaveLength(6);
    });

    it(`keeps every short ${theme.id} name inside the budget too`, () => {
      buildBoard(theme).forEach((space) => {
        const short = boardShortName(space, theme.id);
        if (short === null) return;
        const words = short.split(/[\s-]+/);
        expect(words.length).toBeLessThanOrEqual(MAX_WORDS);
        words.forEach((word) => {
          expect(word.length).toBeLessThanOrEqual(MAX_WORD_LENGTH);
        });
      });
    });
  });
});
