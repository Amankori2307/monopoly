import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../domain/constants/game.constants';
import type { LobbySeat } from './lobby.interfaces';
import {
  claimBlockedReason,
  HOST_ONLY_START_REASON,
  HOST_SEAT_ID,
  inviteLinkFor,
  isHostDevice,
  lobbyPathFor,
  nextFreeSeatId,
  seatIdForIndex,
  seatIndexOf,
  startBlockedReason,
} from './lobby.utils';

const seat = (over: Partial<LobbySeat> = {}): LobbySeat => ({
  seatId: 'player-1',
  name: 'Asha',
  deviceId: 'device-a',
  claimedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const fullTable = () =>
  Array.from({ length: MAX_PLAYERS }, (_unused, index) =>
    seat({
      seatId: seatIdForIndex(index),
      name: `Player ${index}`,
      deviceId: `device-${index}`,
    })
  );

describe('nextFreeSeatId', () => {
  it('is the first seat at an empty table', () => {
    expect(nextFreeSeatId([])).toBe('player-1');
  });

  it('skips seats that are taken', () => {
    expect(nextFreeSeatId([seat({ seatId: 'player-1' })])).toBe('player-2');
  });

  it('is null when the table is full', () => {
    expect(nextFreeSeatId(fullTable())).toBeNull();
  });
});

describe('claimBlockedReason', () => {
  it('lets a new player in', () => {
    expect(claimBlockedReason([], 'device-b', 'Vikram')).toBeNull();
  });

  it('needs a name', () => {
    expect(claimBlockedReason([], 'device-b', '   ')).toMatch(/name/i);
  });

  // "refuses a token somebody else already took" was here. A colour comes from
  // the seat index now, so two players holding one is unrepresentable.

  it('refuses a name somebody else already took, ignoring case', () => {
    expect(claimBlockedReason([seat({ name: 'Asha' })], 'device-b', ' asha ')).toMatch(
      /name/i
    );
  });

  it('lets a device change its own seat rather than counting it twice', () => {
    // Otherwise the only player at a table could not rename themselves.
    const mine = seat({ deviceId: 'device-a', name: 'Asha' });

    expect(claimBlockedReason([mine], 'device-a', 'Asha')).toBeNull();
  });

  it('refuses a seat at a full table', () => {
    expect(claimBlockedReason(fullTable(), 'device-new', 'Late')).toMatch(/full/i);
  });
});

describe('startBlockedReason', () => {
  const two = () => [seat({ seatId: 'player-1' }), seat({ seatId: 'player-2' })];

  it('will not start below the minimum', () => {
    expect(startBlockedReason([seat()], true)).toMatch(new RegExp(String(MIN_PLAYERS)));
  });

  it('starts at the minimum', () => {
    expect(startBlockedReason(two(), true)).toBeNull();
  });

  it('starts at a full table', () => {
    expect(startBlockedReason(fullTable(), true)).toBeNull();
  });

  it('refuses anybody who did not open the table', () => {
    expect(startBlockedReason(two(), false)).toBe(HOST_ONLY_START_REASON);
  });

  /**
   * The ordering is the point, not a detail.
   *
   * Every other reason resolves by waiting; this one never will. A guest told
   * "2 players are needed" at a table that already has two would be watching a
   * button that was never going to come alive for them.
   */
  it('says who may start BEFORE it counts the players', () => {
    expect(startBlockedReason([seat()], false)).toBe(HOST_ONLY_START_REASON);
  });

  it('is a fragment, like every other blocked reason', () => {
    // docs/conventions.md 3d: a fragment, capital initial, no full stop.
    expect(HOST_ONLY_START_REASON).toMatch(/^[A-Z]/);
    expect(HOST_ONLY_START_REASON.endsWith('.')).toBe(false);
  });
});

describe('seatIndexOf', () => {
  it('is the inverse of seatIdForIndex', () => {
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      expect(seatIndexOf(seatIdForIndex(index))).toBe(index);
    }
  });

  it('falls back to the first seat rather than to NaN', () => {
    // It indexes a palette. NaN there is `backgroundColor: undefined`, which is
    // a player you cannot see.
    expect(seatIndexOf('nonsense')).toBe(0);
  });
});

/**
 * The same three branches as `start_game`'s SQL, in the same order.
 *
 * They have to agree: one decides whether the button is offered and the other
 * whether the write is allowed, and a disagreement is either a dead button or a
 * refusal after the click.
 */
describe('isHostDevice', () => {
  const table = () => [
    seat({ seatId: HOST_SEAT_ID, deviceId: 'device-host' }),
    seat({ seatId: 'player-2', deviceId: 'device-guest' }),
  ];

  it('is true for a device holding the host secret', () => {
    // The real check. Whoever has it opened the table; nobody else was sent it.
    expect(isHostDevice(table(), HOST_SEAT_ID, 'device-anything', true)).toBe(true);
  });

  it('fails OPEN when the row records no host at all', () => {
    // A row from before the rule existed. The alternative is a live table that
    // nobody can ever start.
    expect(isHostDevice(table(), null, 'device-guest', false)).toBe(true);
  });

  it('is true for the device sitting in the host seat', () => {
    expect(isHostDevice(table(), HOST_SEAT_ID, 'device-host', false)).toBe(true);
  });

  it('is false for a guest', () => {
    expect(isHostDevice(table(), HOST_SEAT_ID, 'device-guest', false)).toBe(false);
  });

  /**
   * After a host walks out, migration 0006 moves `host_seat_id` to whoever
   * arrived next and NULLS the secret in the same statement. This is the client
   * half of why the secret has to go: the branches are ordered secret-first, so
   * a transferred chair with a live secret arms the strongest check with a
   * value the departing host took with them, and the device branch below is
   * never reached - a table more unstartable than the one the transfer fixed.
   *
   * Nobody holds a secret here, so the successor is the host by their seat.
   */
  it('makes the successor the host once the chair has been transferred', () => {
    const afterTheHostLeft = [seat({ seatId: 'player-2', deviceId: 'device-guest' })];
    expect(isHostDevice(afterTheHostLeft, 'player-2', 'device-guest', false)).toBe(true);
  });

  it('does not make everyone the host when the chair has been transferred', () => {
    // The transfer names one seat. It is not the "no host recorded" case, which
    // is the only one that fails open.
    const afterTheHostLeft = [
      seat({ seatId: 'player-2', deviceId: 'device-guest' }),
      seat({ seatId: 'player-3', deviceId: 'device-third' }),
    ];
    expect(isHostDevice(afterTheHostLeft, 'player-2', 'device-third', false)).toBe(false);
  });

  it('is false for a device with no seat at all', () => {
    // A spectator holding the link used to see a live Start button.
    expect(isHostDevice(table(), HOST_SEAT_ID, 'device-lurker', false)).toBe(false);
  });
});

describe('inviteLinkFor', () => {
  it('points at the join screen, from the origin actually being served', () => {
    // Never from a constant: this app has been served from more than one origin,
    // and a hardcoded one is a link that quietly stops working.
    const link = inviteLinkFor('ABC123');

    expect(link.startsWith(window.location.origin)).toBe(true);
    expect(link).toContain('#/join?code=ABC123');
  });

  it('escapes a code that would need it', () => {
    expect(inviteLinkFor('A B&C')).toContain('code=A%20B%26C');
  });

  /**
   * It used to be the LOBBY url, carrying the game id, the edition and the
   * Speed Die - so following an invitation and typing a code led to two
   * different screens for the same job, and the link was unreadable aloud.
   *
   * None of the three is needed here. The code resolves to the id through
   * `find_game_by_code`; the edition and the Speed Die only matter to the
   * person who starts the game, and only the host can.
   */
  it('carries nothing but the code', () => {
    const link = inviteLinkFor('ABC123');

    expect(link).not.toContain('theme=');
    expect(link).not.toContain('speed=');
    expect(link).not.toContain('/lobby/');
  });
});

describe('lobbyPathFor', () => {
  it('is the in-app path, with no origin on it', () => {
    const path = lobbyPathFor('game-1', 'ABC123', {
      themeId: 'india-edition',
      useSpeedDie: true,
    });

    expect(path).toBe('/lobby/game-1?code=ABC123&theme=india-edition&speed=on');
  });
});
