import { describe, expect, it } from 'vitest';
import { offlineBlockedReason } from './connection.utils';
import { ConnectionState } from './viewer.enums';

/**
 * Pause, do not fork.
 *
 * A move made while the table is unreachable is a move nobody else will ever
 * see, and every further move drifts this device deeper into a private game
 * that cannot be reconciled. A visible stall is worse to look at and far better
 * to recover from than a silent split.
 */
describe('offlineBlockedReason', () => {
  it('never blocks a local game', () => {
    // There is no table to be out of step with.
    for (const connection of Object.values(ConnectionState)) {
      expect(offlineBlockedReason(false, connection)).toBeNull();
    }
  });

  it('allows a move while the table is reachable', () => {
    expect(offlineBlockedReason(true, ConnectionState.Live)).toBeNull();
  });

  it('blocks a move when the table is gone', () => {
    expect(offlineBlockedReason(true, ConnectionState.Offline)).toMatch(/reachable/i);
  });

  it('blocks a move while a publish has not landed', () => {
    // Degraded means the last write did not get through. Carrying on would
    // build a second, private game on top of a move the others never saw.
    expect(offlineBlockedReason(true, ConnectionState.Degraded)).toMatch(/reconnect/i);
  });

  it('says something a player can act on, not a status code', () => {
    const reason = offlineBlockedReason(true, ConnectionState.Offline);

    expect(reason).toMatch(/your moves would not reach the others/i);
  });
});
