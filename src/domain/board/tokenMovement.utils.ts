import { BOARD_SIZE } from '../constants/game.constants';
import { MoveDirection } from '../types/game.enums';

/**
 * The spaces a token passes through on its way somewhere.
 *
 * Pure board geometry, so the walking animation can replay the move the engine
 * made rather than guessing at one. It takes the direction because position
 * alone cannot supply it: three spaces back and thirty-seven forward end on the
 * same square, and the animation used to walk every one of them the long way.
 */

const normalise = (index: number) => ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;

/** Steps forward around the board from one space to another, wrapping past GO. */
export const getForwardSteps = (from: number, to: number): number =>
  (normalise(to) - normalise(from) + BOARD_SIZE) % BOARD_SIZE;

/** Steps backward around the board, wrapping back past GO. */
export const getBackwardSteps = (from: number, to: number): number =>
  (normalise(from) - normalise(to) + BOARD_SIZE) % BOARD_SIZE;

/** How many spaces this move covers, the way it was actually travelled. */
export const getMovementSteps = (
  from: number,
  to: number,
  direction: MoveDirection
): number =>
  direction === MoveDirection.Forward
    ? getForwardSteps(from, to)
    : getBackwardSteps(from, to);

/**
 * The sequence of spaces a token passes through, excluding where it started.
 *
 * There is no length limit. A card sending a player round to GO is twenty-odd
 * spaces and it walks all of them - the cap that used to snap anything past a
 * dice roll is what made "Advance to GO" teleport.
 */
export const getMovementPath = (
  from: number,
  to: number,
  direction: MoveDirection
): number[] => {
  const steps = getMovementSteps(from, to, direction);
  const sign = direction === MoveDirection.Forward ? 1 : -1;

  return Array.from({ length: steps }, (_, index) =>
    normalise(from + sign * (index + 1))
  );
};
