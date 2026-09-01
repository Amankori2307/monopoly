import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RULE_COVERAGE } from './ruleCoverage.constants';

/**
 * Every rule the ruleset documents has a test that proves it.
 *
 * docs/india-edition-rules.md is the source of truth for the ruleset, and until
 * this existed nothing checked that any of it was true - every row was marked ✅
 * on trust. rulesSync.test.ts already holds the doc and the in-app booklet
 * together on topics and numbers; this holds the doc and the *engine* together
 * on behaviour.
 *
 * It fails in three directions, which is the point:
 *   - a rule in the doc with no entry in RULE_COVERAGE
 *   - an entry naming a test that does not exist (renamed, deleted, or typoed)
 *   - an entry for an id the doc no longer has
 */

const RULES_DOC_PATH = resolve(process.cwd(), 'docs/india-edition-rules.md');

if (!existsSync(RULES_DOC_PATH)) {
  throw new Error(
    `Cannot find ${RULES_DOC_PATH}. This test reads the ruleset doc from the repo root; run it from there.`
  );
}

const RULES_DOC = readFileSync(RULES_DOC_PATH, 'utf8');

/** A rule row's id and the text that identifies it in a failure message. */
interface DocumentedRule {
  id: string;
  summary: string;
}

/**
 * Every rule id in the doc, in reading order.
 *
 * A rule row is one whose first cell is an id - which is exactly the rows the id
 * column was added to. Illustration tables (the even-building examples), data
 * lists (tradeable vs not, the space order itself) and the changelog have no id
 * column and are skipped by construction rather than by a list of exceptions
 * here that could go stale.
 */
const documentedRules = (): DocumentedRule[] =>
  RULES_DOC.split('\n').flatMap((line) => {
    const match = /^\|\s*((?:Q\d+|\d+[a-z]*)\.\d+)\s*\|(.*)$/.exec(line);
    if (!match) return [];
    const cells = match[2]
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    return [{ id: match[1], summary: cells[0] ?? '' }];
  });

/** Every `.test.ts(x)` and `.spec.ts` file in the repo. */
const testFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return testFiles(full);
    return /\.(test\.tsx?|spec\.ts)$/.test(entry) ? [full] : [];
  });

/**
 * Every test title in the suite.
 *
 * The title is not always on the same line as the call: `it.each([...])(` puts
 * it on the next one, sometimes after a multi-line array. So this matches the
 * opening quote wherever it falls, and keeps the raw template - an `it.each`
 * title contains `%s`, and that is what the coverage map has to name.
 */
const testTitles = (): Set<string> => {
  const titles = new Set<string>();
  const sources = [
    ...testFiles(resolve(process.cwd(), 'src')),
    ...testFiles(resolve(process.cwd(), 'tests')),
  ];

  sources.forEach((file) => {
    const source = readFileSync(file, 'utf8');
    const pattern = /\b(?:it|test)(?:\.each\([\s\S]*?\))?\s*\(\s*(['"`])([\s\S]*?)\1/g;
    let match = pattern.exec(source);
    while (match) {
      titles.add(match[2].trim());
      match = pattern.exec(source);
    }
  });

  return titles;
};

const RULES = documentedRules();
const TITLES = testTitles();

describe('the ruleset doc', () => {
  it('has rules to check', () => {
    // A parser that silently found nothing would make every check below pass.
    expect(RULES.length).toBeGreaterThan(140);
  });

  it('gives every rule a unique id', () => {
    const seen = new Set<string>();
    const duplicates = RULES.filter((rule) => !seen.add(rule.id)).map((rule) => rule.id);

    expect(duplicates).toEqual([]);
  });
});

describe('the test suite', () => {
  it('was read, and not silently under-collected', () => {
    // Guards the title parser: if it broke, every claimed title would look
    // missing rather than the checks quietly passing.
    expect(TITLES.size).toBeGreaterThan(500);
  });
});

describe('every documented rule has a test', () => {
  it('claims every rule id', () => {
    const unclaimed = RULES.filter((rule) => !RULE_COVERAGE[rule.id]).map(
      (rule) => `${rule.id} — ${rule.summary}`
    );

    expect(unclaimed).toEqual([]);
  });

  it('names a test that exists, for every claim', () => {
    const missing = Object.entries(RULE_COVERAGE).flatMap(([id, titles]) =>
      titles.filter((title) => !TITLES.has(title)).map((title) => `${id} → "${title}"`)
    );

    expect(missing).toEqual([]);
  });

  // A length check alone is not enough: `['a': [,]]` is an array of one
  // `undefined`, which passed for a while during this test's own construction
  // and made 53 rules look claimed when they were not.
  it('claims at least one real test per rule', () => {
    const empty = Object.entries(RULE_COVERAGE)
      .filter(
        ([, titles]) =>
          titles.length === 0 ||
          titles.some((title) => typeof title !== 'string' || title.trim() === '')
      )
      .map(([id]) => id);

    expect(empty).toEqual([]);
  });

  it('claims no rule the doc no longer has', () => {
    const ids = new Set(RULES.map((rule) => rule.id));
    const orphans = Object.keys(RULE_COVERAGE).filter((id) => !ids.has(id));

    expect(orphans).toEqual([]);
  });
});
