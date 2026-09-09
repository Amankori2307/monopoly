import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPACE_STEPS, TEXT_ROLES } from './styleGuide.constants';

/**
 * The style guide shows the whole system, and keeps showing it.
 *
 * Its lists live in TypeScript and the scales live in Sass, and neither side
 * can read the other - the same boundary `boardTracks.guard.test.ts` guards
 * between `$board-corner-track` and `CORNER_TRACK`, and guarded the same way.
 *
 * Without this the failure is silent and the worst kind: a role added to the
 * ramp simply stops appearing on the page that exists to show it, and the page
 * still looks complete.
 */

const SCALE = readFileSync(join(__dirname, '../../styles/abstracts/_scale.scss'), 'utf8');

/** The role names declared in `$type-scale`, in source order. */
const declaredRoles = (): string[] => {
  const block = /\$type-scale:\s*\(([\s\S]*?)\n\);/.exec(SCALE);
  if (!block) throw new Error('$type-scale is not declared in abstracts/_scale.scss');
  return [...block[1].matchAll(/^\s{2}([a-z-]+):\s*\(/gm)].map((match) => match[1]);
};

/** How many rungs `$space-scale` has. */
const declaredSpaceRungs = (): number => {
  const block = /\$space-scale:([\s\S]*?);/.exec(SCALE);
  if (!block) throw new Error('$space-scale is not declared in abstracts/_scale.scss');
  return (block[1].match(/\d+px/g) ?? []).length;
};

describe('the style guide shows the whole system', () => {
  it('parses the scales it is checking against', () => {
    // A sanity check on the regexes: one that silently matched nothing would
    // make both assertions below pass on an empty list.
    expect(declaredRoles().length).toBeGreaterThan(10);
    expect(declaredSpaceRungs()).toBeGreaterThan(10);
  });

  it('renders every type role the ramp declares', () => {
    expect([...TEXT_ROLES].sort()).toEqual(declaredRoles().sort());
  });

  it('renders a rung for every step on the grid', () => {
    expect(SPACE_STEPS.length).toBe(declaredSpaceRungs());
    // The steps it names must be real ones - the number IS the multiple.
    expect(Math.max(...SPACE_STEPS)).toBe(declaredSpaceRungs());
  });
});
