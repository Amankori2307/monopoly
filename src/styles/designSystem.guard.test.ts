import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The design system, enforced.
 *
 * `abstracts/_scale.scss` is the ladder; this is what stops anyone stepping off
 * it. Colour has been guarded three ways for a while - a Sass `@error` in both
 * directions plus `themeContract.guard.test.ts` for the third - and every other
 * axis had nothing at all, which is how the repo arrived at 38 distinct font
 * sizes, 201 spacing literals against 91 token uses, and eleven near-identical
 * inks for one shadow colour.
 *
 * Two kinds of rule live here, and the difference matters.
 *
 * **Clean rules** assert zero violations, everywhere. A rule only becomes clean
 * when its axis has been migrated, so this file grows one rule per phase, in the
 * same commit that makes the rule true. A guard written ahead of its migration
 * sits red for weeks and teaches everyone to ignore it.
 *
 * **Budgets** are the ratchet for an axis still being migrated. Each partial
 * records exactly how many known deviations it has, asserted with `toBe`, not
 * `toBeLessThanOrEqual`. Exact equality is the whole point:
 *
 *   - a NEW literal in a not-yet-migrated file still fails;
 *   - removing one WITHOUT lowering the budget also fails, so the number can
 *     only ever be current - it cannot rot into an aspiration;
 *   - a budget for a file that no longer exists fails, so a rename cannot
 *     orphan an exemption.
 *
 * That is the difference between a ratchet and a rubber stamp. A rubber stamp
 * says "this file is fine". A ratchet says "this file has exactly these twenty
 * known deviations, and the number goes one direction."
 *
 * A budget of `null` means permanently out of scope, and needs a reason naming
 * the doc or the test that justifies it. There are only two.
 */

const STYLES_DIR = __dirname;
const THEMES_FILE = join(STYLES_DIR, 'themes/_themes.scss');

/**
 * Comments and quoted strings are not declarations.
 *
 * Stripped before anything is counted. `themeContract.guard.test.ts` learned
 * this the hard way: scanning raw text let a token named only in a comment -
 * including a comment explaining its own removal - vouch for itself.
 */
const strip = (scss: string): string =>
  scss
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'[^'\n]*'/g, "''")
    .replace(/"[^"\n]*"/g, '""');

const partials = (dir: string = STYLES_DIR, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      partials(path, found);
    } else if (entry.endsWith('.scss')) {
      found.push(path);
    }
  }
  return found;
};

const shortName = (path: string): string => relative(STYLES_DIR, path);

/** Every declaration in a partial, as `[property, value]`. */
const declarations = (scss: string): [string, string][] =>
  [...strip(scss).matchAll(/(^|[;{}\s])([-a-z]+)\s*:\s*([^;{}]+)/g)].map((match) => [
    match[2],
    match[3].trim(),
  ]);

/** A length nobody could call a token: `12px`, `0.86rem`, `-0.02em`. */
const LENGTH_LITERAL = /(?<![\w$.])-?(?:\d+\.?\d*|\.\d+)(px|rem|em)\b/g;

/**
 * Whether a value carries a length that is not zero.
 *
 * Zero is never a magic number, and it is not always the whole value: the
 * sticky dice bar's `env(safe-area-inset-bottom, 0px)` needs that fallback or
 * the inset resolves to nothing at all - CLAUDE.md section 8 records the bug -
 * so a check on the whole value would have counted it forever.
 */
const hasNonZeroLength = (value: string): boolean =>
  [...value.matchAll(LENGTH_LITERAL)].some((match) => parseFloat(match[0]) !== 0);

const isZero = (value: string): boolean => /^0(px|rem|em)?$/.test(value.trim());

const SPACING_PROPS =
  /^(padding|margin|gap|row-gap|column-gap|inset)(-(top|right|bottom|left|block|inline))?(-(start|end))?$/;
const TYPE_PROPS = /^(font|font-size|font-weight|line-height|letter-spacing)$/;

/**
 * A declaration that steps off the ladder.
 *
 * A value referencing a scale variable or a custom property is compliant even
 * when it also does arithmetic - `calc(var(--frame) * 0.54)` is a ratio, not a
 * magic number. A bare literal beside a token (`padding: 10px t.$space-3`) is
 * still counted, which is deliberate: half-migrated is not migrated.
 */
const offLadder = (property: string, value: string): boolean => {
  if (isZero(value)) return false;
  if (SPACING_PROPS.test(property)) return hasNonZeroLength(value);
  if (TYPE_PROPS.test(property)) {
    // Weight and leading are bare numbers, so a literal is any digit that is
    // not part of a token name.
    // `line-height: 1` is the identity - "no extra leading" - the same kind of
    // value as `0` for a length, and it is what a glyph rendered as text needs
    // in order to undo the leading a type role would impose.
    if (property === 'line-height') {
      return !/^[01]$/.test(value.trim()) && /(?<![\w$.-])\d/.test(value);
    }
    if (property === 'font-weight') {
      return /(?<![\w$.-])\d/.test(value);
    }
    return hasNonZeroLength(value);
  }
  return false;
};

const countOffLadder = (scss: string, props: RegExp): number =>
  declarations(scss).filter(
    ([property, value]) => props.test(property) && offLadder(property, value)
  ).length;

interface Budget {
  /** Known spacing deviations, or null when the file is out of scope. */
  spacing: number | null;
  /** Known type deviations, or null when the file is out of scope. */
  type: number | null;
  /** Raw colour literals. Retired by the phase that adds the shadow inks. */
  colour: number | null;
  /** Required. Must name the doc or the test that justifies an out-of-scope null. */
  reason: string;
}

/**
 * Per-file budgets. Driven to zero by the phase that migrates each axis.
 *
 * Only two files are permanently out of scope, and neither is an exemption in
 * the sense of "we would rather not": both are regions the system does not
 * govern.
 */

// All three axes are DONE - 174 type, 171 spacing and 35 colour deviations,
// every one now zero - so the MIGRATING rows are gone rather than sitting at
// 0: the default budget already says 0, and a zero row is only a place for a
// future one to hide.
//
// What is left below is the two regions the system does not GOVERN, which is
// a different thing from an exception. The nine genuine exceptions are marked
// inline, at the site, and counted by the census above.

const BUDGETS: Record<string, Budget> = {
  'abstracts/_scale.scss': {
    spacing: null,
    type: null,
    colour: 0,
    reason: 'It IS the ladder. Every rung is a literal by definition.',
  },
  'abstracts/_tokens.scss': {
    spacing: null,
    type: null,
    colour: 0,
    reason: "This app's own metrics: board tracks, the deed card, header heights.",
  },
  'abstracts/_mixins.scss': {
    spacing: 0,
    type: 0,
    colour: 0,
    reason: 'Where the breakpoint mixins are DEFINED, so the @media rule skips it.',
  },
  'components/_board.scss': {
    spacing: null,
    type: null,
    // The nine shading literals are the documented permanent exception: they
    // shade an arbitrary inline player colour, so there is no theme-dependent
    // decision for them to express. See docs/theming.md.
    colour: 0,
    reason:
      'Board geometry is frozen and calibrated by 21 e2e tests in board.spec.ts. ' +
      'Its type is a continuous function of board size - clamp(5px, 1.4cqw, 0.67rem), ' +
      '1.15em, 0.85em - which a rem ramp cannot express, and its spacing literals are ' +
      'sub-grid values inside a fluid cell where a 4px grid means nothing. Its nine ' +
      'colour literals shade an inline player colour - docs/theming.md.',
  },
};

const budgetFor = (name: string): Budget =>
  BUDGETS[name] ?? { spacing: 0, type: 0, colour: 0, reason: 'Fully on the ladder.' };

/**
 * A sanctioned exception, marked at the site rather than in an allowlist.
 *
 * An allowlist is invisible from the code it excuses: nobody reading a partial
 * learns the file is exempt, and the next literal gets in free. A marker sits
 * on the line, in the diff, beside the thing it excuses - and it is greppable,
 * so "what are we still not doing?" has a one-command answer.
 *
 * A marker covers from its own line to the next blank line or closing brace,
 * which is what lets one comment cover a multi-line gradient rather than eight
 * copies of itself.
 */
const EXEMPT_MARKER = 'design-system-exempt:';

/**
 * How many sanctioned exceptions the tree carries. Ratcheted, so one more can
 * be added only by raising this number where a reviewer sees it.
 */
const EXEMPTION_CENSUS = 4;

/** The lines a marker's reason covers, and the reasons themselves. */
const exemptions = (scss: string): { lines: Set<number>; reasons: string[] } => {
  const lines = scss.split('\n');
  const covered = new Set<number>();
  const reasons: string[] = [];
  lines.forEach((line, index) => {
    const at = line.indexOf(EXEMPT_MARKER);
    if (at === -1) return;
    reasons.push(line.slice(at + EXEMPT_MARKER.length).trim());
    for (let ahead = index; ahead < lines.length; ahead += 1) {
      const next = lines[ahead].trim();
      if (ahead > index && (next === '' || next.startsWith('}'))) break;
      covered.add(ahead + 1);
    }
  });
  return { lines: covered, reasons };
};

/** Every raw colour in a partial, with its value, so a failure is a worklist. */
const rawColours = (scss: string): string[] => {
  const exempt = exemptions(scss).lines;
  return strip(scss)
    .split('\n')
    .flatMap((line, index) =>
      exempt.has(index + 1)
        ? []
        : [...line.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/gi)].map(
            (match) => `${index + 1}: ${match[0]}`
          )
    );
};

describe('the design system', () => {
  const files = partials().map((path) => ({
    name: shortName(path),
    path,
    scss: readFileSync(path, 'utf8'),
  }));

  it('found the stylesheet tree', () => {
    // A sanity check on the walk and the declaration regex together: if either
    // silently stopped matching, every assertion below would pass vacuously.
    expect(files.length).toBeGreaterThan(20);
    expect(
      files.reduce((total, file) => total + declarations(file.scss).length, 0)
    ).toBeGreaterThan(1000);
  });

  it('has no budget for a file that no longer exists', () => {
    const present = new Set(files.map((file) => file.name));
    const orphaned = Object.keys(BUDGETS).filter((name) => !present.has(name));
    expect(orphaned).toEqual([]);
  });

  it('gives every budget a reason', () => {
    const unreasoned = Object.entries(BUDGETS)
      .filter(([, budget]) => budget.reason.trim().length < 20)
      .map(([name]) => name);
    expect(unreasoned).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Clean rules: true today, everywhere, no budget.
  // -------------------------------------------------------------------------

  it('reaches every breakpoint through a mixin', () => {
    // below() for widths, landscape-compact() for a wide-but-short viewport. A
    // bare width query cannot be found when a breakpoint moves, and cannot
    // express the three-term landscape case at all.
    //
    // abstracts/ is skipped because it is where those mixins are DEFINED - the
    // first run of this rule reported the two queries inside below() and
    // landscape-compact() themselves.
    const offenders = files
      .filter((file) => !file.name.startsWith('abstracts/'))
      .flatMap((file) =>
        [
          ...strip(file.scss).matchAll(/@media[^{]*\((?:min|max)-(?:width|height)[^{]*/g),
        ].map((match) => `${file.name}: ${match[0].trim()}`)
      );
    expect(offenders).toEqual([]);
  });

  it('never lets a role silently reset the declaration above it', () => {
    // text() emits the `font` shorthand, which resets weight, family, leading
    // and tracking. So anything set BEFORE the include is discarded without a
    // warning - and the migration hit this ten times, including on the rules
    // booklet's FAQ questions, which lost their bold and said nothing.
    //
    // The rule is: the role first, then any override.
    const RESETTABLE =
      /^\s*(font-weight|letter-spacing|font-family|line-height|text-transform)\s*:/;
    const offenders = files.flatMap((file) => {
      const lines = strip(file.scss).split('\n');
      return lines.flatMap((line, index) => {
        if (!RESETTABLE.test(line)) return [];
        for (
          let ahead = index + 1;
          ahead < Math.min(index + 8, lines.length);
          ahead += 1
        ) {
          if (/^\s*[{}]/.test(lines[ahead])) break;
          if (lines[ahead].includes('@include t.text(')) {
            return [
              `${file.name}:${index + 1}: ${line.trim()} is reset by the role below it`,
            ];
          }
        }
        return [];
      });
    });
    expect(offenders).toEqual([]);
  });

  it('has no trace of the old gap tokens', () => {
    // $gap-xs..xl were 5/9/14/22/28 - a ladder with no relationship between
    // its rungs, and one that the three commonest literals in the app (12px,
    // 10px, 6px) did not even appear on. They are $space-N now, and leaving
    // both spellings alive would recreate exactly the disease: two names for
    // one value. Deleted last, after the rename, so nothing drifted in flight.
    const survivors = files
      .filter((file) => strip(file.scss).includes('$gap-'))
      .map((file) => file.name);
    expect(survivors).toEqual([]);
  });

  it('gives every exemption a reason worth reading', () => {
    // The mechanism guarding the mechanism. A marker with no reason, or one
    // reading "by design", is the rubber stamp this was built to avoid.
    const BOILERPLATE =
      /^(needed|required|design|by design|ok|fine|todo|wip|see above)\.?$/i;
    const offenders = files.flatMap((file) =>
      exemptions(file.scss)
        .reasons.filter((reason) => reason.length < 20 || BOILERPLATE.test(reason))
        .map((reason) => `${file.name}: "${reason}" says nothing`)
    );
    expect(offenders).toEqual([]);
  });

  it('keeps the exemption census where it is', () => {
    // Ratcheted like a budget: another shading comment can be added, but only
    // by raising this number in a diff, which is where that conversation
    // belongs. An allowlist grows silently; a census cannot.
    const census = files.reduce(
      (total, file) => total + exemptions(file.scss).reasons.length,
      0
    );
    expect(census).toBe(EXEMPTION_CENSUS);
  });

  it('names every app-level layer', () => {
    // Below $z-layer-floor a z-index is local to one component's own stacking
    // context - the board's 1-7 for ribbons, tokens and stamps, the player
    // stack's fan - and naming those globally would suggest they compete with
    // the header, which they cannot. At or above it, a bare integer is how the
    // trade scrim came to sit above the header with nothing to explain it.
    const offenders = files.flatMap((file) =>
      declarations(file.scss)
        .filter(
          ([property, value]) => property === 'z-index' && /^\d+$/.test(value.trim())
        )
        .filter(([, value]) => Number(value.trim()) >= 10)
        .map(([, value]) => `${file.name}: z-index: ${value}`)
    );
    expect(offenders).toEqual([]);
  });

  it('takes every duration and easing from a token', () => {
    const offenders = files.flatMap((file) =>
      declarations(file.scss)
        .filter(([property]) => /^(transition|animation)/.test(property))
        .filter(([, value]) => /(?<![\w$.])\d*\.?\d+m?s\b|cubic-bezier\(/.test(value))
        .map(([property, value]) => `${file.name}: ${property}: ${value.slice(0, 48)}`)
    );
    expect(offenders).toEqual([]);
  });

  it('asks before it animates', () => {
    // Every transition and animation sits inside motion(), so the still state
    // is what a reader who asked for less of it gets by default. Six partials
    // used to undo their motion in a separate `reduce` block, which means
    // forgetting the block was the default - and the dice proved it: an
    // infinite tumble with no block anywhere.
    const offenders = files.flatMap((file) => {
      const lines = strip(file.scss).split('\n');
      let depth = 0;
      let motionDepth: number | null = null;
      return lines.flatMap((line, index) => {
        if (line.includes('@include m.motion')) motionDepth = depth;
        const opened = (line.match(/\{/g) ?? []).length;
        const closed = (line.match(/\}/g) ?? []).length;
        const before = depth;
        depth += opened - closed;
        if (motionDepth !== null && depth <= motionDepth) motionDepth = null;
        const moving = /^\s*(transition|animation)\s*:/.test(line);
        if (!moving || /:\s*none/.test(line)) return [];
        return motionDepth === null && before > 0
          ? [`${file.name}:${index + 1}: ${line.trim().slice(0, 44)} is outside motion()`]
          : [];
      });
    });
    expect(offenders).toEqual([]);
  });

  it('takes every radius from a token', () => {
    // The sharp system is a decision, and the four physical pieces are its
    // documented exception - a pawn, a die, its pips and an owner's dot are
    // real objects, not UI surfaces. Both come from tokens, so neither needs a
    // literal. An e2e sweep checks the rendered result; this checks the source.
    const offenders = files.flatMap((file) =>
      declarations(file.scss)
        .filter(
          ([property, value]) =>
            property === 'border-radius' && !isZero(value) && !value.includes('$')
        )
        .map(([, value]) => `${file.name}: border-radius: ${value}`)
    );
    expect(offenders).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Ratcheted axes.
  // -------------------------------------------------------------------------

  it.each(['spacing', 'type', 'colour'] as const)(
    'holds its %s budget in every partial',
    (axis) => {
      const measure = (scss: string): number => {
        if (axis === 'colour') return rawColours(scss).length;
        return countOffLadder(scss, axis === 'spacing' ? SPACING_PROPS : TYPE_PROPS);
      };
      const actual: Record<string, number> = {};
      const expected: Record<string, number> = {};

      for (const file of files) {
        // The palette is where colour is supposed to be.
        if (axis === 'colour' && file.path === THEMES_FILE) continue;
        const budget = budgetFor(file.name)[axis];
        if (budget === null) continue;
        const count = measure(file.scss);
        if (count !== budget) {
          actual[file.name] = count;
          expected[file.name] = budget;
        }
      }

      // Reported as two objects rather than per-file assertions so one run
      // tells you every number to change, and in which direction.
      expect(actual).toEqual(expected);
    }
  );
});

/**
 * Not policed yet, and each one arrives with the phase that migrates it:
 * elevation and scrims, layers, motion, and border widths. Adding a rule for
 * an axis before its migration would only teach everyone to ignore a red test.
 */
export {};
