import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

/**
 * Every control a player presses to roll dice must go through `useDiceRoller`.
 *
 * The Jail panel's "Roll for doubles" did not: it dispatched the command
 * straight out, so a Jail roll had no tumble and no sound while every other roll
 * in the game had both. Nothing caught it, because nothing was looking at the
 * *set* of roll controls - each one was only ever tested on its own.
 *
 * So this reads the source. It is the same tactic `rulesCoverage.test.ts` uses on
 * the ruleset and `tokenStepSound.test.ts` uses on the audio: assert a property
 * of the codebase that no single component's own test can see.
 *
 * Note the deliberately narrow subject. Several engine commands call `rollDie` -
 * a card arrival throws for a utility's rent, and so does a Speed Die
 * destination - but the player is not rolling there, the engine is charging
 * them. This is about controls a player presses.
 */

const COMPONENTS_DIR = join(process.cwd(), 'src/components');
const ROLLER_HOOK = 'useDiceRoller';

/**
 * The test ids of controls a player presses to roll.
 *
 * Every `TEST_IDS` key with "roll" in it has to appear in one of these two
 * lists, so a new roll control cannot be added without a decision being made
 * about it - see the last test.
 */
const ROLL_CONTROLS: string[] = [TEST_IDS.rollButton, TEST_IDS.jailRollButton];

/** Roll-ish ids that are not a control someone presses to roll dice. */
const NOT_ROLL_CONTROLS: Record<string, string> = {};

/** Prop names that carry "roll the dice" into a presentational component. */
const ROLL_HANDLER_PATTERN = /\bon[A-Za-z]*Roll[A-Za-z]*\b/;

interface SourceFile {
  path: string;
  /** Comments removed, so prose about the roller cannot pass for using it. */
  code: string;
}

/**
 * Strips comments, which is not fussiness.
 *
 * The first version of this test looked for the hook's name anywhere in the
 * file, and a component with the roller torn out still passed - because its own
 * doc comment mentioned it by name. A guard a comment can satisfy is no guard.
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const collectSources = (dir: string): SourceFile[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectSources(path);
    }
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) {
      return [];
    }
    return [{ path, code: stripComments(readFileSync(path, 'utf8')) }];
  });

const sources = collectSources(COMPONENTS_DIR);

describe('every dice roll goes through useDiceRoller', () => {
  it('finds the component tree to check', () => {
    // A silent zero here would make every assertion below vacuously true.
    expect(sources.length).toBeGreaterThan(20);
  });

  /**
   * The bug, stated as a property: a file that renders a roll control has to
   * own a roller. Passing the handler down is fine - DecisionPanel does - but
   * whoever puts the button on screen animates it.
   */
  it.each(ROLL_CONTROLS)('gives the control %s a dice roller', (testId) => {
    const rendering = sources.filter((file) =>
      file.code.includes(`data-testid={TEST_IDS.${keyFor(testId)}}`)
    );

    expect(rendering, `nothing renders ${testId}`).not.toHaveLength(0);
    rendering.forEach((file) => {
      // Imported and called, both: either alone can be satisfied by accident.
      expect(
        new RegExp(`import\\s*\\{[^}]*\\b${ROLLER_HOOK}\\b[^}]*\\}`).test(file.code),
        `${file.path} renders ${testId} without importing ${ROLLER_HOOK}`
      ).toBe(true);
      expect(
        new RegExp(`\\b${ROLLER_HOOK}\\s*\\(`).test(file.code),
        `${file.path} renders ${testId} without calling ${ROLLER_HOOK}`
      ).toBe(true);
    });
  });

  /**
   * The exact shape of the defect: the handler wired straight to the click, so
   * the command fires with no tumble and no sound in between.
   */
  it('never wires a roll handler straight to a click', () => {
    const offenders = sources.flatMap((file) =>
      file.code
        .split('\n')
        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
        .filter(
          ({ line }) =>
            /onClick=\{\s*(\(\s*\)\s*=>\s*)?on[A-Za-z]*Roll/.test(line) &&
            ROLL_HANDLER_PATTERN.test(line)
        )
        .map(({ line, number }) => `${file.path}:${number} ${line}`)
    );

    expect(offenders).toEqual([]);
  });

  /**
   * Keeps the list above honest. A new roll control has to be classified, so it
   * cannot quietly join the codebase without this test being read.
   */
  it('classifies every roll-ish test id', () => {
    const rollish = Object.entries(TEST_IDS)
      .filter(([key]) => /roll/i.test(key))
      .map(([, value]) => value);

    const classified = [...ROLL_CONTROLS, ...Object.keys(NOT_ROLL_CONTROLS)];
    expect([...rollish].sort()).toEqual([...classified].sort());
  });
});

/** The TEST_IDS key a value came from, so the assertion can grep for it. */
const keyFor = (testId: string): string => {
  const found = Object.entries(TEST_IDS).find(([, value]) => value === testId);
  if (!found) {
    throw new Error(`No TEST_IDS key for ${testId}`);
  }
  return found[0];
};
