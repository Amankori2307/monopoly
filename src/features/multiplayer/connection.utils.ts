import { ConnectionState } from './viewer.enums';

/**
 * Why this device must not make a move right now, or null when it may.
 *
 * **Pause, do not fork.** A move made while the table is unreachable is a move
 * nobody else will ever see, and every further move drifts this device deeper
 * into a private game that cannot be reconciled afterwards. A visible stall is
 * worse to look at and far better to recover from than a silent split.
 *
 * A local game is never blocked: there is no table to be out of step with.
 */
export const offlineBlockedReason = (
  isOnline: boolean,
  connection: ConnectionState
): string | null => {
  if (!isOnline) {
    return null;
  }
  if (connection === ConnectionState.Offline) {
    return 'This table is no longer reachable. Your moves would not reach the others.';
  }
  if (connection === ConnectionState.Degraded) {
    return 'Reconnecting to the table - your last move has not reached the others yet.';
  }
  return null;
};
