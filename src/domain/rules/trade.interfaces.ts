import type {
  OwnableSpace,
  OwnershipState,
  PlayerId,
  SpaceId,
} from '../types/game.interfaces';

/** One side of a proposed trade, as the offer builder assembles it. */
export interface TradeSide {
  playerId: PlayerId;
  cash: number;
  spaceIds: SpaceId[];
  jailCards: number;
}

/**
 * A space either player could put into a trade, and why not when they cannot.
 *
 * The whole space and its ownership, not a name and a flag: the builder renders
 * the real title deed, so it needs everything the deed shows - the colour group,
 * the rent ladder, the buildings standing on it, and the mortgage. It used to be
 * a name with `(mortgaged)` appended, and a player agreed to deals on that.
 */
export interface TradableSite {
  spaceId: SpaceId;
  space: OwnableSpace;
  ownership: OwnershipState | undefined;
  /** '' when the site can be traded; otherwise why it cannot. */
  blockedReason: string;
}
