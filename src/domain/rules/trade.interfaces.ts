import type { PlayerId, SpaceId } from '../types/game.interfaces';

/** One side of a proposed trade, as the offer builder assembles it. */
export interface TradeSide {
  playerId: PlayerId;
  cash: number;
  spaceIds: SpaceId[];
  jailCards: number;
}

/** A space either player could put into a trade, and why not when they cannot. */
export interface TradableSite {
  spaceId: SpaceId;
  name: string;
  mortgaged: boolean;
  /** '' when the site can be traded; otherwise why it cannot. */
  blockedReason: string;
}
