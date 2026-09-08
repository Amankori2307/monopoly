import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOARD_GRID_SIZE, CORNER_TRACK } from './boardLayout.utils';

/**
 * The board's grid tracks are written twice, and must agree.
 *
 * `.board-grid` needs a real CSS track list, so the stylesheet owns
 * `$board-corner-track`; `getBoardCellCenter` needs the same ratio as a number,
 * so this module owns `CORNER_TRACK`. Neither can be derived from the other
 * across the Sass/TypeScript boundary.
 *
 * Nothing tied them together before. That is a bad kind of duplication: tokens
 * are positioned as percentages of the board computed from the TS ratio, and
 * the squares are laid out by the SCSS one, so a change to either alone leaves
 * every piece sitting slightly off its square - on a board where the pieces are
 * meant to be ON the squares, and with no test anywhere that fails.
 *
 * Same tactic as SOUND_FOR_CUE and AUDIENCE_FOR_DECISION: make the invariant a
 * test rather than a comment nobody reads.
 */
const tokensScss = readFileSync(
  join(__dirname, '../../styles/abstracts/_tokens.scss'),
  'utf8'
);

const scssNumber = (name: string): number => {
  const match = new RegExp(`\\$${name}:\\s*([0-9.]+)`).exec(tokensScss);
  if (!match) {
    throw new Error(`$${name} is not declared in styles/abstracts/_tokens.scss`);
  }
  return Number(match[1]);
};

describe('the board grid tracks', () => {
  it('uses the same corner ratio in the stylesheet and the layout maths', () => {
    expect(scssNumber('board-corner-track')).toBe(CORNER_TRACK);
  });

  it('declares the corner track in fr, which is what the ratio means', () => {
    // A px corner would make the board's proportions depend on its size, and
    // the percentage maths assumes the tracks are all relative.
    expect(tokensScss).toMatch(/\$board-corner-track:\s*[0-9.]+fr\s*;/);
  });

  it('lays the board out as 11 tracks a side', () => {
    // Two corners plus nine spaces. The percentage maths divides by this total,
    // so it is the other half of the same assumption.
    expect(BOARD_GRID_SIZE).toBe(11);
  });
});
