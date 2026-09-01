import type { ScriptedRoll } from './scriptedRandomSource.interfaces';

import { SPEED_DIE_FACES } from '../domain/constants/game.constants';
import { SeededRandomSource, type RandomSource } from '../domain/rules/rng';

/**
 * A dice source that rolls exactly what a test asks it to.
 *
 * `SeededRandomSource` is deterministic but not *chooseable*, so tests that
 * needed a particular outcome used to loop over seeds hunting for one - which
 * cannot express a combination ("a double AND a numeric Speed Die face AND
 * entering the roll on two doubles already"), silently skips cases it fails to
 * find, and in one case ended in a thrown "no seed produced" error.
 *
 * A roll is exactly three draws: the two white dice, then the Speed Die's face
 * index when it is in play. Each queued draw records which of those it is, and
 * the range the engine asks for has to match - so a script that drifts out of
 * step with the engine's call order fails loudly instead of quietly handing back
 * a face index where a die was wanted.
 *
 * Once the script runs out it falls through to a seeded source. A Mr. Monopoly
 * advance onto a utility throws again for rent, and a test about the roll should
 * not have to script what it is not about.
 */
export type { ScriptedRoll } from './scriptedRandomSource.interfaces';

type DrawKind = 'die' | 'speed-die-face';

interface ScriptedDraw {
  kind: DrawKind;
  value: number;
}

const FACE_INDEX_MAX = SPEED_DIE_FACES.length - 1;

const toDraws = (rolls: readonly ScriptedRoll[]): ScriptedDraw[] =>
  rolls.flatMap((roll) => {
    const draws: ScriptedDraw[] = [
      { kind: 'die', value: roll.white[0] },
      { kind: 'die', value: roll.white[1] },
    ];
    if (roll.speedDie !== undefined) {
      const index = SPEED_DIE_FACES.indexOf(roll.speedDie);
      if (index < 0) {
        throw new Error(`${roll.speedDie} is not a Speed Die face`);
      }
      draws.push({ kind: 'speed-die-face', value: index });
    }
    return draws;
  });

/** What the engine must have been asking for, judged by the range. */
const kindOfRequest = (min: number, max: number): DrawKind | null => {
  if (min === 1 && max === 6) return 'die';
  if (min === 0 && max === FACE_INDEX_MAX) return 'speed-die-face';
  return null;
};

export const scriptedRolls = (
  rolls: readonly ScriptedRoll[],
  fallbackSeed = 1
): RandomSource => {
  const queue = toDraws(rolls);
  const fallback = new SeededRandomSource(fallbackSeed);

  return {
    nextInt(minInclusive: number, maxInclusive: number): number {
      const draw = queue.shift();
      if (draw === undefined) {
        return fallback.nextInt(minInclusive, maxInclusive);
      }

      const wanted = kindOfRequest(minInclusive, maxInclusive);
      if (wanted !== draw.kind) {
        throw new Error(
          `Scripted dice out of step: the engine asked for ${wanted ?? `nextInt(${minInclusive}, ${maxInclusive})`} but the script had a ${draw.kind} of ${draw.value} next.`
        );
      }
      if (draw.value < minInclusive || draw.value > maxInclusive) {
        throw new Error(
          `Scripted ${draw.kind} ${draw.value} is outside the range the engine asked for (${minInclusive}-${maxInclusive}).`
        );
      }

      return draw.value;
    },
  };
};
