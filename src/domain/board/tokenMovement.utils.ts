import { BOARD_SIZE, DICE_PER_ROLL, DIE_MAX } from '../constants/game.constants';

/** The furthest a single dice roll can carry a token. */
export const MAX_DICE_DISTANCE = DICE_PER_ROLL * DIE_MAX;

/** Steps forward around the board from one space to another, wrapping past GO. */
export const getForwardSteps = (from: number, to: number): number => {
  const normalise = (index: number) => ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  return (normalise(to) - normalise(from) + BOARD_SIZE) % BOARD_SIZE;
};

/**
 * Whether a move should be walked space by space.
 *
 * Only dice-sized forward hops are walked. Anything longer is a teleport - a
 * card sending the player to GO, or being sent to Jail - and walking those
 * would misrepresent what happened and take absurdly long.
 */
export const isWalkableMove = (from: number, to: number): boolean => {
  const steps = getForwardSteps(from, to);
  return steps > 0 && steps <= MAX_DICE_DISTANCE;
};

/** The sequence of spaces a token passes through, excluding where it started. */
export const getMovementPath = (from: number, to: number): number[] => {
  const steps = getForwardSteps(from, to);
  return Array.from({ length: steps }, (_, index) => (from + index + 1) % BOARD_SIZE);
};
