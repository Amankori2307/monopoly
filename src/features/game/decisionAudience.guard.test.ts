import { describe, expect, it } from 'vitest';
import { PendingDecisionType } from '../../domain/types/game.enums';
import { AUDIENCE_FOR_DECISION } from './decisionAudience';

/**
 * The same tactic as SOUND_FOR_CUE: a new decision type cannot ship until
 * somebody has decided what the rest of the table sees while it is up.
 *
 * The default that would otherwise be chosen - "one player answers, everyone
 * else watches" - is wrong for game over, where there is no owner and everyone
 * needs the button.
 */
describe('every decision declares its audience', () => {
  it.each(Object.values(PendingDecisionType))('%s has a row', (type) => {
    expect(AUDIENCE_FOR_DECISION[type]).toBeDefined();
  });

  it('has no rows for decision types that no longer exist', () => {
    const known = new Set<string>(Object.values(PendingDecisionType));
    const declared = Object.keys(AUDIENCE_FOR_DECISION);

    expect(declared.filter((type) => !known.has(type))).toEqual([]);
  });
});
