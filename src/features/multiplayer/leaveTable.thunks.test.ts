import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/appStore';
import { leaveOnlineTable } from './leaveTable.thunks';
import { attachOnlineSession } from './multiplayer.thunks';
import { HOST_SEAT_ID } from './lobby.utils';
import {
  readDeviceId,
  readHostSecret,
  readJoinCode,
  readSeatClaim,
  writeHostSecret,
  writeJoinCode,
  writeSeatClaim,
} from './seatClaim.utils';

/**
 * Leaving a table, with the network stubbed.
 *
 * What is worth proving here is the ORDERING and the failure handling, because
 * both are silent when they are wrong: an announce after the session reset goes
 * into a LocalSession and nobody hears it, and a local forget on a call that
 * never landed leaves a ghost in a chair that nothing can clear.
 */

vi.mock('./onlineConfig.utils', () => ({
  onlineConfig: { url: 'https://example.supabase.co', anonKey: 'anon' },
  isOnlineEnabled: () => true,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Routes a body per RPC, because a departure makes two different calls and the
 * assertions are about what came back from each.
 */
const captureRpcByName = (bodies: Record<string, unknown>) => {
  const sent: { fn: string; args: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: { body: string }) => {
      const fn = String(url).split('/rpc/')[1] ?? String(url);
      sent.push({ fn, args: JSON.parse(init.body) as Record<string, unknown> });
      const body = bodies[fn] ?? null;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
      });
    })
  );
  return sent;
};

describe('leaving a table', () => {
  const gameId = 'game-1';
  const joinCode = 'ABC234';

  const seated = () => {
    writeSeatClaim(gameId, HOST_SEAT_ID);
    writeJoinCode(gameId, joinCode);
    writeHostSecret(gameId, '11111111-2222-4333-8444-555555555555');
  };

  /**
   * A device can only ever remove ITSELF.
   *
   * 0003's rule applied to a departure: a client says who it is, never which
   * chairs exist. Sending a seat id would let any code-holder evict any player
   * by naming their seat, and the join code is a bearer capability - so this is
   * the difference between a way out and a way to throw somebody else out.
   */
  it('names a device, never a seat', async () => {
    const store = makeStore();
    const sent = captureRpcByName({
      leave_seat: { left: true, revision: 5, phase: 'lobby', seats: [] },
    });

    await store.dispatch(leaveOnlineTable({ gameId, joinCode }));

    const leave = sent.find((call) => call.fn === 'leave_seat');
    expect(leave?.args.p_device_id).toBe(readDeviceId());
    expect(leave?.args.p_seat_id).toBeUndefined();
    expect(leave?.args.p_seats).toBeUndefined();
  });

  /**
   * `leave_seat` bumps the revision but writes nothing through `publish`, so
   * nothing has rung. Without the announce the others watch an occupied chair
   * until their 30s poll comes round - the backstop, not the bell, which is the
   * same 30,121ms bug a seat claim had.
   */
  it('rings the bell before it drops the session', async () => {
    const store = makeStore();
    captureRpcByName({
      leave_seat: { left: true, revision: 7, phase: 'lobby', seats: [] },
    });
    // Attached first, or the announce goes into the LocalSession that accepts
    // everything and does nothing - which is exactly how it would fail in life.
    store.dispatch(attachOnlineSession({ gameId, joinCode, seatId: HOST_SEAT_ID }));
    const announce = vi.spyOn(store.session.current, 'announce');

    await store.dispatch(leaveOnlineTable({ gameId, joinCode }));

    expect(announce).toHaveBeenCalledWith(7);
    // And the session is genuinely gone afterwards, not merely disconnected.
    expect(store.session.current.isOnline).toBe(false);
  });

  it('forgets the seat, the code and the host secret', async () => {
    seated();
    const store = makeStore();
    captureRpcByName({
      leave_seat: { left: true, revision: 5, phase: 'lobby', seats: [] },
    });

    await store.dispatch(leaveOnlineTable({ gameId, joinCode }));

    expect(readSeatClaim(gameId)).toBeNull();
    expect(readJoinCode(gameId)).toBeNull();
    // The row's secret was nulled by the transfer, so a local copy would be a
    // credential for a table that no longer honours it.
    expect(readHostSecret(gameId)).toBeNull();
    expect(store.getState().seat.seatId).toBeNull();
  });

  /**
   * Pause, do not fork - the call `connection.utils` makes for a move, for the
   * same reason. A device that has quietly left a table the server still seats
   * it at is a ghost in a chair that counts against the eight, and nobody can
   * clear it.
   */
  it('stays seated when the server cannot be reached', async () => {
    seated();
    const store = makeStore();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline')))
    );

    const outcome = await store.dispatch(leaveOnlineTable({ gameId, joinCode }));

    expect(outcome).toBe('unreachable');
    expect(readSeatClaim(gameId)).toBe(HOST_SEAT_ID);
    expect(readJoinCode(gameId)).toBe(joinCode);
  });

  /**
   * The host started between the click and the answer. This device's seat is a
   * player on a board by then and `playerOrder` is fixed at `createGameState`,
   * so forgetting it would leave a player nobody can act for and a turn that
   * can never end - breaking the game for everyone still at the table rather
   * than only for the person who wanted to go.
   */
  it('does not abandon a seat in a game that has already started', async () => {
    seated();
    const store = makeStore();
    captureRpcByName({
      leave_seat: {
        left: false,
        alreadyStarted: true,
        revision: 9,
        phase: 'in_progress',
        seats: [],
      },
    });

    const outcome = await store.dispatch(leaveOnlineTable({ gameId, joinCode }));

    expect(outcome).toBe('started');
    expect(readSeatClaim(gameId)).toBe(HOST_SEAT_ID);
    expect(readJoinCode(gameId)).toBe(joinCode);
  });

  it('forgets a table that is no longer there', async () => {
    seated();
    const store = makeStore();
    captureRpcByName({ leave_seat: { left: false, notFound: true } });

    const outcome = await store.dispatch(leaveOnlineTable({ gameId, joinCode }));

    expect(outcome).toBe('missing');
    // Right here where it is wrong above: a seat cannot outlive its row.
    expect(readSeatClaim(gameId)).toBeNull();
  });
});
