import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/appStore';
import { claimLobbySeat } from './multiplayer.thunks';
import { HOST_SEAT_ID, seatIdForIndex } from './lobby.utils';
import { readDeviceId } from './seatClaim.utils';

/**
 * The thunks with the network stubbed.
 *
 * What is worth testing here is the payload that goes out - the client's half of
 * rules the server also enforces - because a client that sends the wrong thing
 * is refused by a server doing its job, and the symptom is a player who cannot
 * join with nothing on screen saying why.
 */

vi.mock('./onlineConfig.utils', () => ({
  onlineConfig: { url: 'https://example.supabase.co', anonKey: 'anon' },
  isOnlineEnabled: () => true,
}));

/** Every POST's parsed body, in order, so a payload can be asserted on. */
const captureRpc = (body: unknown) => {
  const sent: { fn: string; args: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: { body: string }) => {
      sent.push({
        fn: String(url).split('/rpc/')[1] ?? String(url),
        args: JSON.parse(init.body) as Record<string, unknown>,
      });
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('claiming a seat', () => {
  const hostSeat = {
    seatId: HOST_SEAT_ID,
    name: 'Asha',
    deviceId: 'device-host',
    claimedAt: '2026-09-01T00:00:00.000Z',
  };

  /**
   * The bug this file was written for.
   *
   * `/join` claims a seat on the way through, and it reaches that click having
   * only resolved the code to a game id - it has never fetched the table. The
   * seat id was computed from `state.seat.seats`, which is `[]` at that moment,
   * so `nextFreeSeatId` answered `player-1` and every guest asked for the
   * HOST's chair.
   *
   * That is the race migration 0003 was written for, arriving by a new route:
   * before 0005 it deleted the host, and after 0005 the server refuses it and
   * the guest simply never appears. The old lobby's guard was `isLoaded`, which
   * did not come with the claim when it moved.
   */
  it('reads the table before it decides which seat is free', async () => {
    const store = makeStore();
    const sent = captureRpc({ seats: [hostSeat], phase: 'lobby', revision: 2 });

    await store.dispatch(
      claimLobbySeat({ gameId: 'game-1', joinCode: 'ABC234', name: 'Vikram' })
    );

    const claim = sent.find((call) => call.fn === 'claim_seat');
    expect(claim).toBeDefined();
    expect((claim?.args.p_seat as { seatId: string }).seatId).not.toBe(HOST_SEAT_ID);
    expect((claim?.args.p_seat as { seatId: string }).seatId).toBe(seatIdForIndex(1));
  });

  it('fetches the table first, so the seat it picks is the one that is free', async () => {
    const store = makeStore();
    const sent = captureRpc({ seats: [hostSeat], phase: 'lobby', revision: 2 });

    await store.dispatch(
      claimLobbySeat({ gameId: 'game-1', joinCode: 'ABC234', name: 'Vikram' })
    );

    // The read has to come first, not merely happen.
    expect(sent.map((call) => call.fn)).toEqual(['fetch_game', 'claim_seat']);
  });

  it('moves a device already at the table rather than seating it twice', async () => {
    const store = makeStore();
    const mine = { ...hostSeat, seatId: seatIdForIndex(2), deviceId: readDeviceId() };
    const sent = captureRpc({
      seats: [hostSeat, mine],
      phase: 'lobby',
      revision: 3,
    });

    await store.dispatch(
      claimLobbySeat({ gameId: 'game-1', joinCode: 'ABC234', name: 'Renamed' })
    );

    const claim = sent.find((call) => call.fn === 'claim_seat');
    expect((claim?.args.p_seat as { seatId: string }).seatId).toBe(seatIdForIndex(2));
  });

  it('sends one seat, never the table', async () => {
    // 0003's rule, and the reason the merge is done in SQL under the row lock.
    const store = makeStore();
    const sent = captureRpc({ seats: [hostSeat], phase: 'lobby', revision: 2 });

    await store.dispatch(
      claimLobbySeat({ gameId: 'game-1', joinCode: 'ABC234', name: 'Vikram' })
    );

    const claim = sent.find((call) => call.fn === 'claim_seat');
    expect(Array.isArray(claim?.args.p_seat)).toBe(false);
    expect(claim?.args.p_seats).toBeUndefined();
  });
});
