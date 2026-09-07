import type { GameId, PlayerId } from '../../domain/types/game.interfaces';
import { logger } from '../../shared/utils/logger.utils';

/**
 * Which seat this device holds, per game.
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
    const created = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch (error) {
    logger.debug('multiplayer', 'could not persist a device id', { error });
    // A per-session id still works for everything except surviving a reload.
    return crypto.randomUUID();
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
