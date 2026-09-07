import { useEffect } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { logger } from '../../../shared/utils/logger.utils';
import { adoptRemoteGame } from '../../game/gameSlice';
import { setConnection } from '../seatSlice';
import { ConnectionState } from '../viewer.enums';
import { useSession } from './useSession';

/**
 * Keeps this device in step with the table.
 *
 * The bell carries a revision and nothing else, so this is the only place that
 * turns "something moved" into "fetch and adopt". Deliberately not in a thunk:
 * a subscription has a lifetime, and tying it to the page that is showing the
 * game is what guarantees it is torn down when the player leaves.
 */
export const useTableSync = (revision: number): void => {
  const dispatch = useAppDispatch();
  const session = useSession();
  const isOnline = session.isOnline;

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    let cancelled = false;

    const adoptIfNewer = (heardRevision: number) => {
      // Our own publish rings the bell too. Ignoring what we already have keeps
      // a device from fetching its own move back.
      if (cancelled || heardRevision <= revision) {
        return;
      }
      void session
        .fetch()
        .then((update) => {
          if (!cancelled && update) {
            dispatch(adoptRemoteGame(update));
          }
        })
        .catch((error) => {
          dispatch(setConnection(ConnectionState.Degraded));
          logger.error('multiplayer', 'could not fetch after the bell', {
            error: String(error),
          });
        });
    };

    const unsubscribe = session.subscribe(adoptIfNewer);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [dispatch, isOnline, revision, session]);
};
