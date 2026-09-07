import { BOARD_LAYOUT } from '../../../domain/themes/boardLayout.constants';
import { SpaceKind } from '../../../domain/types/game.enums';
import type { BoardSpace } from '../../../domain/types/game.interfaces';
import type { SpaceGlyph } from './spaceIcon.interfaces';
import { SPACE_GLYPHS } from './spaceGlyphs';

/**
 * Which glyph a space gets. Shared by the board cell and the title-deed modal,
 * which used to carry a copy of this map each, plus an identical special case.
 */

export const CORNER_GLYPHS: Partial<Record<SpaceKind, SpaceGlyph>> = {
  [SpaceKind.Go]: SPACE_GLYPHS.go,
  [SpaceKind.FreeParking]: SPACE_GLYPHS.freeParking,
  [SpaceKind.Jail]: SPACE_GLYPHS.justVisiting,
  [SpaceKind.GoToJail]: SPACE_GLYPHS.goToJail,
};

export const KIND_GLYPHS: Partial<Record<SpaceKind, SpaceGlyph>> = {
  [SpaceKind.Railway]: SPACE_GLYPHS.railway,
  [SpaceKind.CommunityChest]: SPACE_GLYPHS.communityChest,
  [SpaceKind.Chance]: SPACE_GLYPHS.chance,
  [SpaceKind.Tax]: SPACE_GLYPHS.tax,
  [SpaceKind.Utility]: SPACE_GLYPHS.waterWorks,
};

/**
 * The two spaces that need something other than their kind's default: one of
 * two utilities, one of two taxes.
 *
 * Derived from the shared layout rather than written out. It used to be a
 * literal `{ 12: electricCompany, 38: superTax }`, which was really a fact
 * about the India board wearing an index for a key - correct, but only because
 * there was one board. The layout says which utility and which tax each square
 * is, so this now holds for every edition by construction.
 *
 * Keyed by index rather than by display name for the original reason, which
 * still stands: the name is what the board prints and what the ruleset doc
 * pins, so renaming a square is an ordinary edit - and when this map was keyed
 * by name, such an edit silently dropped the icon with no test failing.
 */
const INDEX_GLYPH_OVERRIDES: Record<number, SpaceGlyph> = BOARD_LAYOUT.reduce<
  Record<number, SpaceGlyph>
>((overrides, square, index) => {
  if (square.kind === SpaceKind.Utility && square.utility === 'electric') {
    overrides[index] = SPACE_GLYPHS.electricCompany;
  }
  if (square.kind === SpaceKind.Tax && square.tax === 'super') {
    overrides[index] = SPACE_GLYPHS.superTax;
  }
  return overrides;
}, {});

export const getSpaceIcon = (space: BoardSpace): SpaceGlyph | undefined =>
  INDEX_GLYPH_OVERRIDES[space.index] ?? KIND_GLYPHS[space.kind];

export const getCornerIcon = (space: BoardSpace): SpaceGlyph | undefined =>
  CORNER_GLYPHS[space.kind];
