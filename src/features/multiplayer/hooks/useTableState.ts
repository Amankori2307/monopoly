import type { GameState } from '../../../domain/types/game.interfaces';
import type { Viewer } from '../viewer.interfaces';
import { useConnectionMessage } from './useConnectionMessage';
import { usePresence } from './usePresence';
import { useTableSync } from './useTableSync';
import { useViewer } from './useViewer';

/** Everything a game screen needs to know about the table it is played on. */
export interface UseTableStateResult {
  /** Who is at this screen - the hot seat, one seat, or a spectator. */
  viewer: Viewer;
  /** What to tell the player about the connection, or null when all is well. */
  connectionMessage: string | null;
  /** Seats with a device connected. Empty means "no presence information". */
  connectedSeatIds: ReadonlySet<string>;
}

/**
 * The four table concerns as one hook.
 *
 * Combined because they are one question from the page's point of view - "what
 * is this table and where do I stand in it" - and because four separate calls
 * pushed GamePage past its line limit for the third time. A local game answers
 * all of them without a network: hot-seat viewer, no message, no presence.
 */
export const useTableState = (
  game: GameState | null,
  revision: number
): UseTableStateResult => {
  // Somebody else's move arrives here: the bell carries a revision, this
  // fetches and adopts. A local game's session never rings.
  useTableSync(revision);

  return {
    viewer: useViewer(game),
    connectionMessage: useConnectionMessage(),
    connectedSeatIds: usePresence(),
  };
};
