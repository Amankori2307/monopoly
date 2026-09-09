import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../domain/constants/game.constants';
import type { LobbySeat } from './lobby.interfaces';
import {
  claimBlockedReason,
  inviteLinkFor,
  lobbyPathFor,
  nextFreeSeatId,
  seatIdForIndex,
  startBlockedReason,
} from './lobby.utils';

const seat = (over: Partial<LobbySeat> = {}): LobbySeat => ({
  seatId: 'player-1',
  name: 'Asha',
  tokenId: 'elephant',
  deviceId: 'device-a',
  claimedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const fullTable = () =>
  Array.from({ length: MAX_PLAYERS }, (_unused, index) =>
    seat({
      seatId: seatIdForIndex(index),
      name: `Player ${index}`,
      tokenId: `token-${index}`,
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
    expect(claimBlockedReason([], 'device-b', 'Vikram', 'train')).toBeNull();
  });

  it('needs a name', () => {
    expect(claimBlockedReason([], 'device-b', '   ', 'train')).toMatch(/name/i);
  });

  it('refuses a token somebody else already took', () => {
    expect(
      claimBlockedReason([seat({ tokenId: 'train' })], 'device-b', 'Vikram', 'train')
    ).toMatch(/token/i);
  });

  it('refuses a name somebody else already took, ignoring case', () => {
    expect(
      claimBlockedReason([seat({ name: 'Asha' })], 'device-b', ' asha ', 'train')
    ).toMatch(/name/i);
  });

  it('lets a device change its own seat rather than counting it twice', () => {
    // Otherwise the only player at a table could not change their own token.
    const mine = seat({ deviceId: 'device-a', tokenId: 'train', name: 'Asha' });

    expect(claimBlockedReason([mine], 'device-a', 'Asha', 'train')).toBeNull();
  });

  it('refuses a seat at a full table', () => {
    expect(claimBlockedReason(fullTable(), 'device-new', 'Late', 'ship')).toMatch(
      /full/i
    );
  });
});

describe('startBlockedReason', () => {
  it('will not start below the minimum', () => {
    expect(startBlockedReason([seat()])).toMatch(new RegExp(String(MIN_PLAYERS)));
  });

  it('starts at the minimum', () => {
    expect(
      startBlockedReason([seat({ seatId: 'player-1' }), seat({ seatId: 'player-2' })])
    ).toBeNull();
  });

  it('starts at a full table', () => {
    expect(startBlockedReason(fullTable())).toBeNull();
  });
});

describe('inviteLinkFor', () => {
  const options = { themeId: 'us-edition', useSpeedDie: false };

  it('carries the game and the code, from the origin actually being served', () => {
    // Never from a constant: this app has been served from more than one origin,
    // and a hardcoded one is a link that quietly stops working.
    const link = inviteLinkFor('game-1', 'ABC123', options);

    expect(link.startsWith(window.location.origin)).toBe(true);
    expect(link).toContain('#/lobby/game-1');
    expect(link).toContain('code=ABC123');
  });

  it('escapes a code that would need it', () => {
    expect(inviteLinkFor('game-1', 'A B&C', options)).toContain('code=A%20B%26C');
  });

  /**
   * The edition matters to a guest, not only to the host: seat tokens come from
   * `theme.tokenCatalog`, so a guest whose lobby defaulted to another edition
   * picks a token id the host's board has no piece for. The lobby used to
   * hardcode `availableThemes[0]`, so every non-India table was exactly that.
   */
  it('carries the table options so every device agrees on the edition', () => {
    const link = inviteLinkFor('game-1', 'ABC123', options);

    expect(link).toContain('theme=us-edition');
    expect(link).toContain('speed=off');
  });

  it('says when the Speed Die is on', () => {
    const link = inviteLinkFor('game-1', 'ABC123', { ...options, useSpeedDie: true });

    expect(link).toContain('speed=on');
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
