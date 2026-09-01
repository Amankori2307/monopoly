import { describe, expect, it } from 'vitest';
import { SPEED_DIE_FACES } from '../domain/constants/game.constants';
import { rollDie } from '../domain/rules/rng';
import { rollSpeedDie } from '../domain/rules/speedDie.utils';
import { SpeedDieFace } from '../domain/types/game.enums';
import { scriptedRolls } from './scriptedRandomSource';

/**
 * The test double every doubles scenario stands on, so it has to be honest: a
 * script that drifts out of step with the engine must fail rather than hand back
 * a plausible-looking wrong number.
 */
describe('scripted rolls', () => {
  it('rolls the white dice it was given, in order', () => {
    const source = scriptedRolls([{ white: [3, 5] }]);

    expect(rollDie(source)).toBe(3);
    expect(rollDie(source)).toBe(5);
  });

  it('rolls the Speed Die face it was given', () => {
    const source = scriptedRolls([{ white: [2, 4], speedDie: SpeedDieFace.MrMonopoly }]);

    rollDie(source);
    rollDie(source);
    expect(rollSpeedDie(source)).toBe(SpeedDieFace.MrMonopoly);
  });

  it.each(
    SPEED_DIE_FACES.filter((face, index) => SPEED_DIE_FACES.indexOf(face) === index)
  )('can ask for the %s face', (face) => {
    const source = scriptedRolls([{ white: [1, 2], speedDie: face }]);

    rollDie(source);
    rollDie(source);
    expect(rollSpeedDie(source)).toBe(face);
  });

  it('plays several rolls in sequence', () => {
    const source = scriptedRolls([{ white: [1, 1] }, { white: [6, 2] }]);

    expect([rollDie(source), rollDie(source)]).toEqual([1, 1]);
    expect([rollDie(source), rollDie(source)]).toEqual([6, 2]);
  });

  // The whole point: drift has to be loud.
  it('throws when the engine asks for a die but a face is next', () => {
    const source = scriptedRolls([{ white: [2, 2], speedDie: SpeedDieFace.Bus }]);

    rollDie(source);
    rollDie(source);
    // The face is next, so asking for another die is a script that has drifted.
    expect(() => rollDie(source)).toThrow(/out of step/i);
  });

  it('throws when the engine asks for a face but a die is next', () => {
    const source = scriptedRolls([{ white: [2, 2] }, { white: [3, 3] }]);

    rollDie(source);
    rollDie(source);
    expect(() => rollSpeedDie(source)).toThrow(/out of step/i);
  });

  it('throws on a die value no real die could show', () => {
    const source = scriptedRolls([{ white: [7, 1] }]);

    expect(() => rollDie(source)).toThrow(/outside the range/i);
  });

  it('throws on a face that is not on the Speed Die', () => {
    expect(() =>
      scriptedRolls([{ white: [1, 1], speedDie: 'teleport' as SpeedDieFace }])
    ).toThrow(/not a Speed Die face/i);
  });

  // So a test can script the roll it cares about and let the rest be arbitrary.
  it('falls through to a seeded source once the script runs out', () => {
    const source = scriptedRolls([{ white: [4, 4] }]);

    expect([rollDie(source), rollDie(source)]).toEqual([4, 4]);
    const extra = rollDie(source);
    expect(extra).toBeGreaterThanOrEqual(1);
    expect(extra).toBeLessThanOrEqual(6);
  });

  it('falls through deterministically, so a test cannot flake', () => {
    const drawFive = () => {
      const source = scriptedRolls([{ white: [4, 4] }]);
      return Array.from({ length: 5 }, () => rollDie(source));
    };

    expect(drawFive()).toEqual(drawFive());
  });
});
