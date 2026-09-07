import { MAX_PLAYERS, MIN_PLAYERS } from '../../domain/constants/game.constants';
import type { LobbySeat } from './lobby.interfaces';

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
    return 'Somebody has already taken that token';
  }
  if (held.some((seat) => seat.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    return 'Somebody is already using that name';
  }
  return null;
};

/** Why the game cannot start yet, or null when it can. */
export const startBlockedReason = (seats: LobbySeat[]): string | null => {
  if (seats.length < MIN_PLAYERS) {
    return `Waiting for players - ${MIN_PLAYERS} is the minimum`;
  }
  if (seats.length > MAX_PLAYERS) {
    return `Too many players - ${MAX_PLAYERS} is the maximum`;
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
export const inviteLinkFor = (gameId: string, joinCode: string): string => {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/lobby/${gameId}?code=${encodeURIComponent(joinCode)}`;
};
