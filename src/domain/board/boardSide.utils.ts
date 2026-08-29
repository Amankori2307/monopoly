import { BOARD_SIZE } from '../constants/game.constants';
import { BoardSide } from '../types/game.enums';

const SPACES_PER_SIDE = 10;

/**
 * Which edge of the board a space index sits on, walking anticlockwise from GO.
 *
 * Corners belong to the side they start: GO (0) is on the bottom edge, Jail (10)
 * on the left, Free Parking (20) on the top, Go To Jail (30) on the right. They
 * render no ribbon, so the choice only matters for consistency.
 */
export const getBoardSide = (index: number): BoardSide => {
  const normalised = ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;

  if (normalised < SPACES_PER_SIDE) {
    return BoardSide.Bottom;
  }
  if (normalised < SPACES_PER_SIDE * 2) {
    return BoardSide.Left;
  }
  if (normalised < SPACES_PER_SIDE * 3) {
    return BoardSide.Top;
  }
  return BoardSide.Right;
};
