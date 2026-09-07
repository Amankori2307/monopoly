import { useAppSelector } from '../../../app/hooks';
import type { GameState } from '../../../domain/types/game.interfaces';
import type { Viewer } from '../viewer.interfaces';
import { resolveViewer } from '../viewer.utils';

/**
 * Who is at this screen.
 *
 * A hot-seat game resolves to the hot-seat viewer whatever this device has
 * stored, because `tableMode` is shared state - so every gate behaves exactly
 * as it did before seats existed.
 */
export const useViewer = (game: GameState | null): Viewer => {
  const claimedSeatId = useAppSelector((state) => state.seat.seatId);
  return resolveViewer(game, claimedSeatId);
};
