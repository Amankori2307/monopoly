import { SpaceKind } from '../types/game.enums';
import type { BoardSpace } from '../types/game.interfaces';
import { isOwnableSpace } from '../rules/space.utils';
import { BOARD_LAYOUT } from './boardLayout.constants';
import { nounsFor } from './nouns.utils';

/**
 * What a square prints on the board itself: its amount, and - where its full
 * name is too long for a small square - a short one.
 *
 * This is board *vocabulary*, so it sits beside `nouns.utils`: the same reason
 * `money()` resolves the currency symbol rather than each caller writing one.
 * Pure, like everything else here - the cell renders what these return.
 */

/**
 * The amount a square prints, or null when it prints none.
 *
 * A printed board states the price on every square you can buy and the amount
 * on every square that charges you. Corners, Chance and Community Chest state
 * nothing, because there is nothing fixed to state.
 */
export const boardPriceOf = (space: BoardSpace): number | null => {
  if (isOwnableSpace(space)) {
    return space.price;
  }
  return space.kind === SpaceKind.Tax ? space.amount : null;
};

/**
 * The utilities, in the edition's words.
 *
 * Not on the theme: every edition calls them the same two things, because the
 * squares themselves are the same two things. `nouns` carries only what
 * genuinely differs between boards - what a site is called, and what a railway
 * is called.
 */
const UTILITY_SHORT_NAMES: Record<'electric' | 'water', string> = {
  electric: 'Electric',
  water: 'Water',
};

/**
 * A shorter label for a square whose full name will not set in a small one, or
 * null when the full name is what should be shown.
 *
 * Only six squares per board need it, and the reason is the LINE COUNT rather
 * than the character count. Every street name on every edition is at most three
 * words with no word longer than fourteen characters, which sets in three
 * wrapped lines beside a price. ("Northumberland Avenue" is twenty-one
 * characters - the twelve-character claim that used to be written here was
 * simply false.) The four railways and the two utilities break that: "Chennai
 * Central Railway Station" is four lines at every board size, because
 * "CHENNAI CENTRAL" is 9.44em and the line is never that long. Four lines plus
 * a price needs more than the square has above a 5px legibility floor, so those
 * six print the kind of square they are instead, as a small printed board does.
 *
 * boardNames.utils.test.ts pins the invariant that makes this enough.
 *
 * The railway word comes from the theme, because that is the one this edition
 * actually uses: stations in London, railroads in the US, airports on the world
 * board. The utility comes from `BOARD_LAYOUT`, which already says which of the
 * two each square is - the same source the icon registry reads, and the reason
 * neither has to hardcode an India board index.
 *
 * Both elements are rendered and the board's container query picks one; CSS
 * cannot substitute text, and a JS width check is the thing this codebase
 * deliberately does not do for layout.
 */
export const boardShortName = (space: BoardSpace, themeId: string): string | null => {
  if (space.kind === SpaceKind.Railway) {
    return nounsFor(themeId).railway;
  }
  if (space.kind !== SpaceKind.Utility) {
    return null;
  }
  const layout = BOARD_LAYOUT[space.index];
  return layout?.kind === SpaceKind.Utility ? UTILITY_SHORT_NAMES[layout.utility] : null;
};
