import { MAX_PLAYERS, MIN_PLAYERS } from '../../domain/constants/game.constants';
import type { LobbySeat, TableOptions } from './lobby.interfaces';

/**
 * The rules of a table that has not started yet.
 *
 * Stated as `*BlockedReason` functions, the way every other rule in this app is,
 * so the button that is disabled and the action that is refused read from the
 * same sentence rather than drifting apart.
 */

/** Seat ids are the player ids the game will be created with. */
export const seatIdForIndex = (index: number): string => `player-${index + 1}`;

/** The first seat nobody holds, or null when the table is full. */
export const nextFreeSeatId = (seats: LobbySeat[]): string | null => {
  for (let index = 0; index < MAX_PLAYERS; index += 1) {
    const seatId = seatIdForIndex(index);
    if (!seats.some((seat) => seat.seatId === seatId)) {
      return seatId;
    }
  }
  return null;
};

/** Why this device cannot take a seat, or null when it can. */
export const claimBlockedReason = (
  seats: LobbySeat[],
  deviceId: string,
  name: string,
  tokenId: string
): string | null => {
  if (!name.trim()) {
    return 'Enter a name first';
  }
  // A device already at the table is changing its seat, not taking a second.
  const held = seats.filter((seat) => seat.deviceId !== deviceId);

  if (held.length >= MAX_PLAYERS) {
    return 'This table is full';
  }
  if (held.some((seat) => seat.tokenId === tokenId)) {
    return 'That token is taken';
  }
  if (held.some((seat) => seat.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    return 'That name is taken';
  }
  return null;
};

/** Why the game cannot start yet, or null when it can. */
export const startBlockedReason = (seats: LobbySeat[]): string | null => {
  if (seats.length < MIN_PLAYERS) {
    return `${MIN_PLAYERS} players are needed to start`;
  }
  if (seats.length > MAX_PLAYERS) {
    return `${MAX_PLAYERS} players is the most a table holds`;
  }
  return null;
};

/**
 * The link to send someone.
 *
 * Built from `window.location` rather than from a constant, because the app is
 * served from more than one origin over its life and a hardcoded one is a link
 * that quietly stops working. The hash is load-bearing - see CLAUDE.md section 8.
 */

/** The in-app path for a lobby, options included. */
export const lobbyPathFor = (
  gameId: string,
  joinCode: string,
  options: TableOptions
): string =>
  `/lobby/${gameId}?code=${encodeURIComponent(joinCode)}` +
  `&theme=${encodeURIComponent(options.themeId)}` +
  `&speed=${options.useSpeedDie ? 'on' : 'off'}`;

export const inviteLinkFor = (
  gameId: string,
  joinCode: string,
  options: TableOptions
): string => {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${lobbyPathFor(gameId, joinCode, options)}`;
};
