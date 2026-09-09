import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { TABLE_MESSAGES } from '../multiplayer.constants';
import { attachOnlineSession } from '../multiplayer.thunks';
import { isOnlineEnabled } from '../onlineConfig.utils';
import { readJoinCode, readSeatClaim } from '../seatClaim.utils';
import { restoreSeat, setJoinCode, setLobbyError } from '../seatSlice';
import { useSession } from './useSession';

/**
 * Puts this device back on an online table it already belongs to.
 *
 * Without this, opening an online game cold - a refresh mid-game, or Rejoin
 * from the saved-games list - loaded the state and attached nothing:
 * `attachOnlineSession` was called only from `useLobby`, and `restoreSeat` was
 * exported and dispatched nowhere at all. So `resolveViewer` failed closed to
 * Spectator and every control was dead. A frozen game, on your own save.
 *
 * Three things about the effect's shape are load-bearing:
 *
 * - **Primitive dependencies.** `activeGame`'s identity changes on every
 *   command and every adopt, so depending on the game object would re-run this
 *   constantly. Same tactic as `useDiceRoller`, which keys on the faces rather
 *   than the array.
 * - **Nothing it dispatches is a dependency.** `restoreSeat`, `setJoinCode` and
 *   `attachOnlineSession` write `seat.seatId`, `seat.joinCode`, `sessionEpoch`
 *   and `connection`. Keying on any of them would make the handler cancel its
 *   own effect - the bug `useLobby` hit with `connection` - and here it would
 *   be worse, because replacing a session CLOSES the previous one: a loop would
 *   rebuild the socket every render.
 * - **The guard is `session.gameId`, read through a ref.** It is the only fact
 *   that answers "already attached" without reading what the attach writes, and
 *   it also covers the lobby handing over to the game screen, where the session
 *   is already correct and must not be torn down at that exact moment.
 */
export const useTableRejoin = (gameId: string | null, isOnlineTable: boolean): void => {
  const dispatch = useAppDispatch();
  const session = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!gameId || !isOnlineTable || sessionRef.current.gameId === gameId) {
      return;
    }

    // Never let requireConfig() throw from in here: a throw inside an effect
    // goes past every catch in the app to ErrorBoundary, so "you opened an
    // online save on a build with no server" would render as a crash.
    if (!isOnlineEnabled()) {
      dispatch(setLobbyError(TABLE_MESSAGES.offlineBuild));
      return;
    }

    const joinCode = readJoinCode(gameId);
    if (!joinCode) {
      // Nothing this device can do: without the code it can neither read nor
      // write this table. Staying a spectator is the right failure - but it
      // has to say why, or the game merely looks broken.
      dispatch(setLobbyError(TABLE_MESSAGES.codeLost));
      return;
    }

    // The seat first, so the viewer resolves before anything reports Live.
    dispatch(restoreSeat(gameId));
    dispatch(setJoinCode(joinCode));
    dispatch(attachOnlineSession({ gameId, joinCode, seatId: readSeatClaim(gameId) }));
  }, [dispatch, gameId, isOnlineTable]);
};
