import type { GameEventCue } from '../../domain/types/game.enums';

/** A typed bid, tagged with the moment of the auction it was typed at. */
export interface KeyedBidInput {
  /** See auctionBidKey: the auction, the bidder, and the standing high bid. */
  key: string;
  amount: number;
}

/**
 * A cue waiting to be sounded.
 *
 * The id is the event's, so two identical cues in a row are two sounds - keying
 * on the cue value alone would swallow the second.
 */
export interface PendingSoundCue {
  id: string;
  cue: GameEventCue;
}
