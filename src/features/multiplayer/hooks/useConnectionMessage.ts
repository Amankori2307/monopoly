import { useAppSelector } from '../../../app/hooks';
import { offlineBlockedReason } from '../connection.utils';
import { useSession } from './useSession';

/**
 * What to tell the player about the table, or null when there is nothing to say.
 *
 * The same sentence the command path refuses with, so the banner and the
 * refusal cannot disagree about what is wrong - the pattern every
 * `*BlockedReason` in this app already follows.
 */
export const useConnectionMessage = (): string | null => {
  const connection = useAppSelector((state) => state.seat.connection);
  const session = useSession();

  return offlineBlockedReason(session.isOnline, connection);
};
