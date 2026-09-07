import { useEffect, useState } from 'react';
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
  // `useSession` re-renders when the session is replaced, so its identity is
  // the right dependency - and unlike `connection` it does not change while a
  // fetch is in flight, which would tear this down and re-attach for nothing.
  const session = useSession();

  useEffect(() => {
    if (!session.isOnline) {
      setHere(new Set());
      return;
    }
    return session.onHere((seatIds) => setHere(new Set(seatIds)));
  }, [session]);

  return here;
};
