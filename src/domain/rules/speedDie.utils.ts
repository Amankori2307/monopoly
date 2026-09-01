import { SPEED_DIE_FACES } from '../constants/game.constants';
import { SpeedDieFace } from '../types/game.enums';
import type { GameState } from '../types/game.interfaces';
import type { RandomSource } from './rng';

/**
 * The Speed Die: an optional third die that changes the turn loop.
 *
 * Kept out of the engine because its three interesting faces are rules in their
 * own right, and because "is it in play yet" is a question with a real answer
 * that the engine should not have to spell out inline.
 */

/**
 * True once the die is actually in play.
 *
 * Two conditions, both printed: the game was set up with it, and every player
 * has been round the board once. A bankrupt player cannot pass GO again, so
 * they are not counted - otherwise one bankruptcy would freeze the die forever.
 */
export const isSpeedDieActive = (state: GameState): boolean =>
  state.useSpeedDie &&
  state.playerOrder
    .map((playerId) => state.players[playerId])
    .filter((player) => !player.isBankrupt)
    .every((player) => player.hasPassedGo);

/** One roll of the Speed Die, from the same source as the white dice. */
export const rollSpeedDie = (randomSource: RandomSource): SpeedDieFace =>
  SPEED_DIE_FACES[randomSource.nextInt(0, SPEED_DIE_FACES.length - 1)];

/** The 1, 2 or 3 a numeric face adds, or 0 for Bus and Mr. Monopoly. */
export const speedDieSteps = (face: SpeedDieFace | null): number => {
  if (face === SpeedDieFace.One) return 1;
  if (face === SpeedDieFace.Two) return 2;
  if (face === SpeedDieFace.Three) return 3;
  return 0;
};

/**
 * All three dice showing the same number: move to any space on the board.
 *
 * Deliberately not a double. The white dice happen to match, but the printed
 * rule is that a triple is its own outcome and grants no extra roll - which is
 * why the caller has to ask this before acting on the doubles count.
 */
export const isTriple = (
  dieOne: number,
  dieTwo: number,
  face: SpeedDieFace | null
): boolean => dieOne === dieTwo && speedDieSteps(face) === dieOne;
