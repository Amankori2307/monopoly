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

/**
 * Which chair this is, counting from zero.
 *
 * The inverse of `seatIdForIndex`, and the only thing a seat's COLOUR is
 * derived from: the palette is assigned by creation order and the seat id
 * becomes the player id, so seat 3 is palette entry 2 in the lobby and still
 * palette entry 2 once the game exists. Nothing has to be stored or sent.
 */
export const seatIndexOf = (seatId: string): number => {
  const index = Number.parseInt(seatId.replace('player-', ''), 10) - 1;
  return Number.isFinite(index) && index >= 0 ? index : 0;
};

/** The seat the person who opened the table takes. See createOnlineLobby. */
export const HOST_SEAT_ID = seatIdForIndex(0);

/**
 * Why a device that did not open this table cannot start it.
 *
 * One constant, used twice: `startBlockedReason` disables the button with it
 * before the click, and `startOnlineGame` shows the same words when the SERVER
 * refuses. Two spellings of one rule is exactly what docs/conventions.md 3d
 * exists to stop, and this rule is enforced in two places by design.
 */
export const HOST_ONLY_START_REASON = 'Only the host can start this table';

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
  name: string
): string | null => {
  if (!name.trim()) {
    return 'Enter a name first';
  }
  // A device already at the table is changing its seat, not taking a second.
  const held = seats.filter((seat) => seat.deviceId !== deviceId);

  if (held.length >= MAX_PLAYERS) {
    return 'This table is full';
  }
  // There was a "That token is taken" here. Nobody picks a colour now - it
  // comes from the seat index - so two players sharing one is unrepresentable
  // rather than refused.
  if (held.some((seat) => seat.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    return 'That name is taken';
  }
  return null;
};

/**
 * Why the game cannot start yet, or null when it can.
 *
 * The host clause comes FIRST, and that ordering is the point: every other
 * reason resolves by waiting, and this one never will. Telling a guest that two
 * players are needed, at a table that already has four, is a lie by omission.
 */
export const startBlockedReason = (
  seats: LobbySeat[],
  isHost: boolean
): string | null => {
  if (!isHost) {
    return HOST_ONLY_START_REASON;
  }
  if (seats.length < MIN_PLAYERS) {
    return `${MIN_PLAYERS} players are needed to start`;
  }
  if (seats.length > MAX_PLAYERS) {
    return `${MAX_PLAYERS} players is the most a table holds`;
  }
  return null;
};

/**
 * Whether this device opened the table.
 *
 * Three branches, in the same order as `start_game`'s SQL and for the same
 * reasons, so the button and the server can never disagree:
 *
 *   1. We hold the host secret. The real answer - the secret is minted by
 *      `create_game` and returned by nothing else, so no other device has it.
 *   2. No host is recorded at all. A row created before the rule existed; fail
 *      OPEN, because the alternative is a live table nobody can ever start.
 *   3. Otherwise: are we the device sitting in the host's seat? Transitional
 *      only. `deviceId` is handed to every code-holder by `fetch_game`, so this
 *      branch stops an accident, never an attacker.
 */
export const isHostDevice = (
  seats: LobbySeat[],
  hostSeatId: string | null,
  deviceId: string,
  hasHostSecret: boolean
): boolean => {
  if (hasHostSecret) {
    return true;
  }
  if (hostSeatId === null) {
    return true;
  }
  return seats.some((seat) => seat.seatId === hostSeatId && seat.deviceId === deviceId);
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

/**
 * The link to send someone, which is the JOIN screen and not the lobby.
 *
 * It used to be the lobby URL, so a guest following it landed on a table and
 * then had to fill in a name and a token to sit down - while somebody who had
 * been READ the code got a different screen for the same job. One door now:
 * both end up on `/join`, which takes the code and the name together and seats
 * them. The lobby is a roster, with no form on it at all.
 *
 * It carries neither the game id nor the table's options. The code resolves to
 * the id through `find_game_by_code`, the options only matter to the host - who
 * is the only person who can start - and a link short enough to read out loud
 * is worth more here than a saved round trip.
 */
export const inviteLinkFor = (joinCode: string): string => {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/join?code=${encodeURIComponent(joinCode)}`;
};
