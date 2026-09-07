import {
  INCOME_TAX_AMOUNT,
  RAILWAY_MORTGAGE_VALUE,
  RAILWAY_PRICE,
  RAILWAY_RENT_BY_COUNT,
  SUPER_TAX_AMOUNT,
  UTILITY_MORTGAGE_VALUE,
  UTILITY_PRICE,
  UTILITY_RENT_MULTIPLIER_BOTH,
  UTILITY_RENT_MULTIPLIER_ONE,
} from '../constants/board.constants';
import { SpaceKind } from '../types/game.enums';
import type { BoardSpace } from '../types/game.interfaces';
import { BOARD_LAYOUT } from './boardLayout.constants';
import type { LayoutSquare } from './boardLayout.interfaces';
import type { GameTheme } from './theme.interfaces';

/**
 * The board, as one theme names it.
 *
 * Every edition shares the layout - forty squares, in fixed positions, at fixed
 * prices - so the only thing a theme brings to this is what each square is
 * called. Building the board rather than writing it out per theme is what stops
 * a new edition quietly shipping a different game.
 */

/** Space ids are positional and stable: index 7 is always `space-7`. */
export const toSpaceId = (index: number): string => `space-${index}`;

const buildSquare = (square: LayoutSquare, index: number, name: string): BoardSpace => {
  const base = { id: toSpaceId(index), index, name };

  switch (square.kind) {
    case SpaceKind.Street:
      return {
        ...base,
        kind: SpaceKind.Street,
        colorGroup: square.colorGroup,
        price: square.price,
        mortgageValue: square.mortgageValue,
        houseCost: square.houseCost,
        // A hotel costs what a house does; the ladder is what makes it dear.
        hotelCost: square.houseCost,
        rents: {
          baseRent: square.rents[0],
          monopolyRent: square.rents[1],
          with1House: square.rents[2],
          with2Houses: square.rents[3],
          with3Houses: square.rents[4],
          with4Houses: square.rents[5],
          withHotel: square.rents[6],
        },
      };

    case SpaceKind.Railway:
      return {
        ...base,
        kind: SpaceKind.Railway,
        price: RAILWAY_PRICE,
        mortgageValue: RAILWAY_MORTGAGE_VALUE,
        rentByCount: RAILWAY_RENT_BY_COUNT,
      };

    case SpaceKind.Utility:
      return {
        ...base,
        kind: SpaceKind.Utility,
        price: UTILITY_PRICE,
        mortgageValue: UTILITY_MORTGAGE_VALUE,
        rentMultiplierOne: UTILITY_RENT_MULTIPLIER_ONE,
        rentMultiplierBoth: UTILITY_RENT_MULTIPLIER_BOTH,
      };

    case SpaceKind.Tax:
      return {
        ...base,
        kind: SpaceKind.Tax,
        amount: square.tax === 'income' ? INCOME_TAX_AMOUNT : SUPER_TAX_AMOUNT,
      };

    default:
      // The corners and the two card squares carry nothing but a name.
      return { ...base, kind: square.kind };
  }
};

export const buildBoard = (theme: GameTheme): BoardSpace[] =>
  BOARD_LAYOUT.map((square, index) =>
    buildSquare(square, index, theme.spaceNames[index])
  );
