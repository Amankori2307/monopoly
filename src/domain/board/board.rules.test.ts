import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chanceCards, communityChestCards } from '../cards/indiaEditionCards';
import { BOARD_SIZE, CORNER_POSITIONS } from '../constants/game.constants';
import { ColorGroup, SpaceKind } from '../types/game.enums';
import type { StreetSpace } from '../types/game.interfaces';
import { indiaEditionBoard } from './indiaEditionBoard';

/**
 * The board, checked against the board the ruleset documents.
 *
 * Section 13 of docs/india-edition-rules.md is the published description of this
 * board, and it had no coverage at all - the other board tests are geometry, so
 * a renamed space or a mispriced street would have gone unnoticed while every
 * layout test stayed green.
 *
 * The doc is read as the fixture rather than transcribed into this file, which
 * is what makes drift impossible: change the board and the doc must follow, or
 * these fail.
 */

const RULES_DOC_PATH = resolve(process.cwd(), 'docs/india-edition-rules.md');

if (!existsSync(RULES_DOC_PATH)) {
  throw new Error(
    `Cannot find ${RULES_DOC_PATH}. This test reads the ruleset doc from the repo root; run it from there.`
  );
}

const RULES_DOC = readFileSync(RULES_DOC_PATH, 'utf8');

/**
 * The documented space order, as index -> name.
 *
 * The table is laid out in two column pairs to fit on a page - `| # | Space | #
 * | Space |` - so each row carries two spaces, not one.
 */
const documentedSpaceOrder = (): Map<number, string> => {
  const section = RULES_DOC.split('### Space order')[1] ?? '';
  const table = section.split('\n---')[0];
  const order = new Map<number, string>();

  table.split('\n').forEach((line) => {
    if (!line.startsWith('|')) return;
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    for (let pair = 0; pair + 1 < cells.length; pair += 2) {
      const index = Number(cells[pair]);
      if (Number.isInteger(index) && cells[pair + 1]) {
        order.set(index, cells[pair + 1]);
      }
    }
  });

  return order;
};

const SPACE_ORDER = documentedSpaceOrder();

const streets = indiaEditionBoard.filter(
  (space): space is StreetSpace => space.kind === SpaceKind.Street
);
const indicesOf = (kind: SpaceKind) =>
  indiaEditionBoard.filter((space) => space.kind === kind).map((space) => space.index);

describe('the documented space order', () => {
  it('was read from the doc, and not silently missed', () => {
    // Without this, an empty map would make the check below pass vacuously.
    expect(SPACE_ORDER.size).toBe(BOARD_SIZE);
  });

  it('matches the space order the ruleset documents', () => {
    const mismatches = [...SPACE_ORDER.entries()]
      .filter(([index, name]) => indiaEditionBoard[index]?.name !== name)
      .map(
        ([index, name]) =>
          `${index}: doc says "${name}", board says "${indiaEditionBoard[index]?.name}"`
      );

    expect(mismatches).toEqual([]);
  });

  it('gives every space the index it sits at', () => {
    indiaEditionBoard.forEach((space, index) => expect(space.index).toBe(index));
  });
});

describe('the documented board facts', () => {
  it('has forty spaces', () => {
    expect(indiaEditionBoard).toHaveLength(40);
  });

  it('has twenty-eight ownable assets: 22 streets, 4 railways, 2 utilities', () => {
    expect(streets).toHaveLength(22);
    expect(indicesOf(SpaceKind.Railway)).toHaveLength(4);
    expect(indicesOf(SpaceKind.Utility)).toHaveLength(2);
    expect(
      streets.length +
        indicesOf(SpaceKind.Railway).length +
        indicesOf(SpaceKind.Utility).length
    ).toBe(28);
  });

  it('has eight colour groups of the documented sizes', () => {
    const sizes = new Map<ColorGroup, number>();
    streets.forEach((street) =>
      sizes.set(street.colorGroup, (sizes.get(street.colorGroup) ?? 0) + 1)
    );

    expect(sizes.size).toBe(8);
    expect(Object.fromEntries(sizes)).toEqual({
      [ColorGroup.Brown]: 2,
      [ColorGroup.LightBlue]: 3,
      [ColorGroup.Pink]: 3,
      [ColorGroup.Orange]: 3,
      [ColorGroup.Red]: 3,
      [ColorGroup.Yellow]: 3,
      [ColorGroup.Green]: 3,
      [ColorGroup.DarkBlue]: 2,
    });
  });

  it('puts the three Chance spaces at 7, 22 and 36', () => {
    expect(indicesOf(SpaceKind.Chance)).toEqual([7, 22, 36]);
  });

  it('puts the three Community Chest spaces at 2, 17 and 33', () => {
    expect(indicesOf(SpaceKind.CommunityChest)).toEqual([2, 17, 33]);
  });

  it('puts the four corners at 0, 10, 20 and 30', () => {
    expect([...CORNER_POSITIONS]).toEqual([0, 10, 20, 30]);
    expect(indiaEditionBoard[0].kind).toBe(SpaceKind.Go);
    expect(indiaEditionBoard[10].kind).toBe(SpaceKind.Jail);
    expect(indiaEditionBoard[20].kind).toBe(SpaceKind.FreeParking);
    expect(indiaEditionBoard[30].kind).toBe(SpaceKind.GoToJail);
  });

  it('has eight Chance cards', () => {
    expect(chanceCards).toHaveLength(8);
  });

  it('has eight Community Chest cards', () => {
    expect(communityChestCards).toHaveLength(8);
  });
});
