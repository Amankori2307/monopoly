import { useEffect, useState } from 'react';
import { useAppSelector } from '../../../app/hooks';
import { useSession } from './useSession';

/**
 * Which seats have a device connected right now.
 *
 * Empty for a local game, where the question has no meaning - everyone is
 * sharing one screen. A caller should treat empty as "no presence information",
 * not as "nobody is here", or a hot-seat game would render every player as
 * absent.
 */
export const usePresence = (): ReadonlySet<string> => {
  const [here, setHere] = useState<ReadonlySet<string>>(new Set());
  const session = useSession();
  // The registry is not React state, so this is what re-runs the effect when
  // the session is swapped - see useLobby for the same reason.
  const connection = useAppSelector((state) => state.seat.connection);

  useEffect(() => {
    if (!session.isOnline) {
      setHere(new Set());
      return;
    }
    return session.onHere((seatIds) => setHere(new Set(seatIds)));
  }, [connection, session]);

  return here;
};
