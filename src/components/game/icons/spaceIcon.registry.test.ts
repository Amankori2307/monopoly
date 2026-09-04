import { describe, expect, it } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import { BOARD_SIZE } from '../../../domain/constants/game.constants';
import { SpaceKind } from '../../../domain/types/game.enums';
import { CORNER_GLYPHS, getCornerIcon, getSpaceIcon } from './spaceIcon.registry';
import { SPACE_GLYPHS } from './spaceGlyphs';

/**
 * The registry's failure mode is silence.
 *
 * The two overrides were keyed by display name, so renaming "Electric Company"
 * dropped its icon with nothing failing - the board just quietly showed the
 * generic utility glyph instead. Keying by index fixes the mechanism; these
 * tests are what stop the next hole being opened the same way.
 */

const streets = indiaEditionBoard.filter((space) => space.kind === SpaceKind.Street);
const nonStreets = indiaEditionBoard.filter((space) => space.kind !== SpaceKind.Street);

const glyphFor = (space: (typeof indiaEditionBoard)[number]) =>
  getCornerIcon(space) ?? getSpaceIcon(space);

describe('the space icon registry', () => {
  it('gives every space that should have a glyph one', () => {
    const missing = nonStreets.filter((space) => glyphFor(space) === undefined);

    expect(missing.map((space) => `${space.index} ${space.name}`)).toEqual([]);
    // 40 spaces less the 22 streets. Stated as a number so that deleting an
    // entry and a space together cannot quietly satisfy the check above.
    expect(nonStreets).toHaveLength(BOARD_SIZE - streets.length);
    expect(nonStreets).toHaveLength(18);
  });

  // Iterating the enum rather than the board: a kind added to the game without
  // a glyph fails here, before it ever reaches a board.
  it('covers every space kind except Street', () => {
    const uncovered = Object.values(SpaceKind).filter((kind) => {
      if (kind === SpaceKind.Street) {
        return false;
      }
      return (
        CORNER_GLYPHS[kind] === undefined && getSpaceIcon({ kind } as never) === undefined
      );
    });

    expect(uncovered).toEqual([]);
  });

  /**
   * The overrides are positional, so the risk moves from renames to re-layouts.
   * This is what catches one.
   */
  it('keeps each index override on the kind it was written for', () => {
    expect(indiaEditionBoard[12].kind).toBe(SpaceKind.Utility);
    expect(indiaEditionBoard[12].name).toBe('Electric Company');
    expect(getSpaceIcon(indiaEditionBoard[12])).toBe(SPACE_GLYPHS.electricCompany);

    expect(indiaEditionBoard[38].kind).toBe(SpaceKind.Tax);
    expect(indiaEditionBoard[38].name).toBe('Super Tax');
    expect(getSpaceIcon(indiaEditionBoard[38])).toBe(SPACE_GLYPHS.superTax);
  });

  // The other space of each overridden kind must still get the default.
  it('leaves the un-overridden space of the same kind on its default', () => {
    const waterWorks = indiaEditionBoard.find((space) => space.name === 'Water Works');
    const incomeTax = indiaEditionBoard.find((space) => space.name === 'Income Tax');

    expect(getSpaceIcon(waterWorks!)).toBe(SPACE_GLYPHS.waterWorks);
    expect(getSpaceIcon(incomeTax!)).toBe(SPACE_GLYPHS.tax);
  });

  // Streets carry no glyph: the ribbon is their identity, and the longest names
  // have no room to spare on the axis an icon would take.
  it('gives a street no glyph', () => {
    streets.forEach((street) => expect(getSpaceIcon(street)).toBeUndefined());
    expect(streets).toHaveLength(22);
  });
});

/**
 * Colour is the whole reason these stopped being files. A glyph carrying its own
 * fill would be immune to the theme exactly as the .svg files were.
 */
describe('the glyph data', () => {
  it('carries geometry only, never a colour', () => {
    Object.entries(SPACE_GLYPHS).forEach(([name, glyph]) => {
      expect(glyph.d, `${name} has no path`).not.toBe('');
      expect(glyph.d, `${name} bakes in a colour`).not.toMatch(/#|rgb|fill/i);
      expect(glyph.viewBox, `${name} has no viewBox`).toMatch(/^0 0 \d+ \d+$/);
    });
  });
});
