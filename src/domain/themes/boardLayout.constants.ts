import { ColorGroup, SpaceKind } from '../types/game.enums';
import type { LayoutSquare } from './boardLayout.interfaces';

/**
 * What the board *is*, for every theme.
 *
 * Prices, rents, mortgage values and what each square does are the ruleset, not
 * the decoration - so they are stated once here and a theme only names them.
 * That is the whole reason a new theme is forty strings rather than a
 * spreadsheet, and it is what stops two themes drifting into two subtly
 * different games that both claim to be Monopoly.
 *
 * Index is positional and stable: entry 7 is always `space-7`, on every theme.
 * Cards move players by index, the icon registry keys off it, and the token
 * walk counts in it.
 *
 * The rent tuple is [base, monopoly, 1 house, 2, 3, 4, hotel].
 */
export const BOARD_LAYOUT: readonly LayoutSquare[] = [
  { kind: SpaceKind.Go },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Brown,
    price: 60,
    mortgageValue: 30,
    houseCost: 50,
    rents: [2, 4, 10, 30, 90, 160, 250],
  },
  { kind: SpaceKind.CommunityChest },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Brown,
    price: 60,
    mortgageValue: 30,
    houseCost: 50,
    rents: [4, 8, 20, 60, 180, 320, 450],
  },
  { kind: SpaceKind.Tax, tax: 'income' },
  { kind: SpaceKind.Railway },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.LightBlue,
    price: 100,
    mortgageValue: 50,
    houseCost: 50,
    rents: [6, 12, 30, 90, 270, 400, 550],
  },
  { kind: SpaceKind.Chance },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.LightBlue,
    price: 100,
    mortgageValue: 50,
    houseCost: 50,
    rents: [6, 12, 30, 90, 270, 400, 550],
  },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.LightBlue,
    price: 120,
    mortgageValue: 60,
    houseCost: 50,
    rents: [8, 16, 40, 100, 300, 450, 600],
  },
  { kind: SpaceKind.Jail },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Pink,
    price: 140,
    mortgageValue: 70,
    houseCost: 100,
    rents: [10, 20, 50, 150, 450, 625, 750],
  },
  // The electric one of the two utilities - the icon registry keys off this.
  { kind: SpaceKind.Utility, utility: 'electric' },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Pink,
    price: 140,
    mortgageValue: 70,
    houseCost: 100,
    rents: [10, 20, 50, 150, 450, 625, 750],
  },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Pink,
    price: 160,
    mortgageValue: 80,
    houseCost: 100,
    rents: [12, 24, 60, 180, 500, 700, 900],
  },
  { kind: SpaceKind.Railway },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Orange,
    price: 180,
    mortgageValue: 90,
    houseCost: 100,
    rents: [14, 28, 70, 200, 550, 750, 950],
  },
  { kind: SpaceKind.CommunityChest },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Orange,
    price: 180,
    mortgageValue: 90,
    houseCost: 100,
    rents: [14, 28, 70, 200, 550, 750, 950],
  },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Orange,
    price: 200,
    mortgageValue: 100,
    houseCost: 100,
    rents: [16, 32, 80, 220, 600, 800, 1000],
  },
  { kind: SpaceKind.FreeParking },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Red,
    price: 220,
    mortgageValue: 110,
    houseCost: 150,
    rents: [18, 36, 90, 250, 700, 875, 1050],
  },
  { kind: SpaceKind.Chance },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Red,
    price: 220,
    mortgageValue: 110,
    houseCost: 150,
    rents: [18, 36, 90, 250, 700, 875, 1050],
  },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Red,
    price: 240,
    mortgageValue: 120,
    houseCost: 150,
    rents: [20, 40, 100, 300, 750, 925, 1100],
  },
  { kind: SpaceKind.Railway },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Yellow,
    price: 260,
    mortgageValue: 130,
    houseCost: 150,
    rents: [22, 44, 110, 330, 800, 975, 1150],
  },
  { kind: SpaceKind.Utility, utility: 'water' },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Yellow,
    price: 260,
    mortgageValue: 130,
    houseCost: 150,
    rents: [22, 44, 110, 330, 800, 975, 1150],
  },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Yellow,
    price: 280,
    mortgageValue: 140,
    houseCost: 150,
    rents: [24, 48, 120, 360, 850, 1025, 1200],
  },
  { kind: SpaceKind.GoToJail },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Green,
    price: 300,
    mortgageValue: 150,
    houseCost: 200,
    rents: [26, 52, 130, 390, 900, 1100, 1275],
  },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Green,
    price: 300,
    mortgageValue: 150,
    houseCost: 200,
    rents: [26, 52, 130, 390, 900, 1100, 1275],
  },
  { kind: SpaceKind.CommunityChest },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.Green,
    price: 320,
    mortgageValue: 160,
    houseCost: 200,
    rents: [28, 56, 150, 450, 1000, 1200, 1400],
  },
  { kind: SpaceKind.Railway },
  { kind: SpaceKind.Chance },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.DarkBlue,
    price: 350,
    mortgageValue: 175,
    houseCost: 200,
    rents: [35, 70, 175, 500, 1100, 1300, 1500],
  },
  { kind: SpaceKind.Tax, tax: 'super' },
  {
    kind: SpaceKind.Street,
    colorGroup: ColorGroup.DarkBlue,
    price: 400,
    mortgageValue: 200,
    houseCost: 200,
    rents: [50, 100, 200, 600, 1400, 1700, 2000],
  },
];

/** Indices a card or a rule refers to by position rather than by name. */
export const GO_INDEX = 0;
export const JAIL_INDEX = 10;
