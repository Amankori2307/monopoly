import type { TokenId } from '../../domain/types/game.interfaces';

/** One seat at a table that has not started yet. */
export interface LobbySeat {
  /** Becomes the player's id when the game is created. */
  seatId: string;
  name: string;
  tokenId: TokenId;
  /** Which device holds it. A reconnect from a new device changes this. */
  deviceId: string;
  claimedAt: string;
}
