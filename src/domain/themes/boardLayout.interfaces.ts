import type { ColorGroup, SpaceKind } from '../types/game.enums';

/** [base, monopoly, 1 house, 2 houses, 3, 4, hotel]. */
export type StreetRents = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * One square's economics, with no name attached.
 *
 * The name is the theme's; everything here is the ruleset's. Splitting them is
 * what makes a new theme a list of forty strings.
 */
export type LayoutSquare =
  | {
      kind: SpaceKind.Street;
      colorGroup: ColorGroup;
      price: number;
      mortgageValue: number;
      houseCost: number;
      rents: StreetRents;
    }
  | { kind: SpaceKind.Railway }
  /** Which utility, so the icon registry does not have to key off an index. */
  | { kind: SpaceKind.Utility; utility: 'electric' | 'water' }
  /** Which tax, for the same reason. */
  | { kind: SpaceKind.Tax; tax: 'income' | 'super' }
  | { kind: SpaceKind.Go }
  | { kind: SpaceKind.Jail }
  | { kind: SpaceKind.FreeParking }
  | { kind: SpaceKind.GoToJail }
  | { kind: SpaceKind.Chance }
  | { kind: SpaceKind.CommunityChest };
