import type { GameId, PlayerId } from '../../domain/types/game.interfaces';
import { logger } from '../../shared/utils/logger.utils';
import { randomUUID } from '../../domain/rules/id.utils';
import { normaliseJoinCode } from './joinCode.utils';

/**
 * What this device knows about a table: which seat it holds, and the code that
 * lets it read the table at all.
 *
 * Per-device rather than in the game state, and that split is deliberate:
 * `tableMode` must be agreed by everyone, but "which of you am I" is the one
 * fact that is genuinely local. Two people on two laptops hold different seats
 * in the same game; storing that in the shared state would mean each publish
 * overwrote the other's identity.
 *
 * Guarded the way `soundPreference.utils` is - private modes throw on write,
 * and a browser with storage blocked throws on the read too. Losing a claim
 * degrades this device to a spectator, which is the right failure: it can still
 * watch, and re-claim.
 */

export const SEAT_CLAIM_KEY_PREFIX = 'monopoly.seat';

export const getSeatClaimKey = (gameId: GameId): string =>
  `${SEAT_CLAIM_KEY_PREFIX}.${gameId}.v1`;

/** A stable id for this browser, so a seat knows which device holds it. */
export const DEVICE_ID_KEY = 'monopoly.device.v1';

export const readDeviceId = (): string => {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      return existing;
    }
    const created = randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch (error) {
    logger.debug('multiplayer', 'could not persist a device id', { error });
    // A per-session id still works for everything except surviving a reload.
    return randomUUID();
  }
};

export const readSeatClaim = (gameId: GameId): PlayerId | null => {
  try {
    return window.localStorage.getItem(getSeatClaimKey(gameId));
  } catch (error) {
    logger.debug('multiplayer', 'could not read the seat claim', { error });
    return null;
  }
};

export const writeSeatClaim = (gameId: GameId, seatId: PlayerId): void => {
  try {
    window.localStorage.setItem(getSeatClaimKey(gameId), seatId);
  } catch (error) {
    logger.debug('multiplayer', 'could not save the seat claim', { error });
  }
};

export const clearSeatClaim = (gameId: GameId): void => {
  try {
    window.localStorage.removeItem(getSeatClaimKey(gameId));
  } catch (error) {
    logger.debug('multiplayer', 'could not clear the seat claim', { error });
  }
};

// ---------------------------------------------------------------------------
// The join code, per game.
//
// It IS the capability, and until now it lived in exactly two places a reload
// destroys: `seat.joinCode` in Redux, and the lobby URL's `?code=` - which the
// game URL does not carry. So an online game sat in the recent-games index
// (`startOnlineGame` calls `saveGame`) and could be opened and then not played:
// nothing could re-attach a session without a code, so `resolveViewer` failed
// closed to Spectator and every control was dead. A frozen game on your own
// save.
//
// Per-device for the same reason the seat claim is - a device that was never
// given the code must not be able to read it back out of somebody's save.
// ---------------------------------------------------------------------------

export const JOIN_CODE_KEY_PREFIX = 'monopoly.code';

export const getJoinCodeKey = (gameId: GameId): string =>
  `${JOIN_CODE_KEY_PREFIX}.${gameId}.v1`;

export const readJoinCode = (gameId: GameId): string | null => {
  try {
    const stored = window.localStorage.getItem(getJoinCodeKey(gameId));
    // Validated rather than trusted: this is whatever is on the disk of a
    // browser that may have run an older build or been hand-edited, and an
    // invalid code would be sent to the network. Compared against its own
    // normalisation rather than a length, so a future longer code still reads.
    if (!stored || normaliseJoinCode(stored) !== stored) {
      return null;
    }
    return stored;
  } catch (error) {
    logger.debug('seat', 'could not read the join code', { error });
    return null;
  }
};

export const writeJoinCode = (gameId: GameId, joinCode: string): void => {
  try {
    window.localStorage.setItem(getJoinCodeKey(gameId), joinCode);
  } catch (error) {
    logger.debug('seat', 'could not save the join code', { error });
  }
};

export const clearJoinCode = (gameId: GameId): void => {
  try {
    window.localStorage.removeItem(getJoinCodeKey(gameId));
  } catch (error) {
    logger.debug('seat', 'could not clear the join code', { error });
  }
};
