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
 * Keyed by **index**, not by display name. The name is what the board prints
 * and what the ruleset doc pins, so renaming a space is an ordinary edit - and
 * when this map was keyed by name, such an edit silently dropped the icon with
 * no test failing. Indices are positional and stable by construction
 * (indiaEditionBoard: "index 7 is always space-7"), and the registry test
 * asserts each one still holds the kind it was written for.
 */
const INDEX_GLYPH_OVERRIDES: Record<number, SpaceGlyph> = {
  12: SPACE_GLYPHS.electricCompany,
  38: SPACE_GLYPHS.superTax,
};

export const getSpaceIcon = (space: BoardSpace): SpaceGlyph | undefined =>
  INDEX_GLYPH_OVERRIDES[space.index] ?? KIND_GLYPHS[space.kind];

export const getCornerIcon = (space: BoardSpace): SpaceGlyph | undefined =>
  CORNER_GLYPHS[space.kind];
