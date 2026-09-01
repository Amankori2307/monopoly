import type { AuctionLedgerEntry, AuctionState } from '../types/game.interfaces';
import { AuctionLedgerKind } from '../types/game.enums';

/**
 * What makes a bid legal, stated once.
 *
 * The engine throws from here and the auction panel disables its button from
 * here, so the two cannot disagree about what the player is allowed to offer -
 * the same arrangement `buildBlockedReason` has with the site panel. A panel
 * that restated the rule would drift the moment the increment changed.
 */

/** The smallest bid that would take the lead. */
export const minimumBidFor = (auction: AuctionState): number =>
  Math.max(auction.startPrice, auction.highestBid + auction.minIncrement);

/**
 * Why this bid cannot be made, or null when it can.
 *
 * Cash is the second limit and it bites often: an auction has no credit, so a
 * player cannot bid past what they are holding.
 */
export const bidBlockedReason = (
  auction: AuctionState,
  bidderCash: number,
  amount: number
): string | null => {
  const minimum = minimumBidFor(auction);

  if (!Number.isFinite(amount)) {
    return 'Enter a bid.';
  }
  if (amount < minimum) {
    return `Bid must be at least ${minimum}.`;
  }
  if (amount > bidderCash) {
    return 'Bid exceeds available cash.';
  }

  return null;
};

/** Appends one line to an auction's ledger, oldest first. */
export const appendAuctionEntry = (
  auction: AuctionState,
  entry: AuctionLedgerEntry
): AuctionLedgerEntry[] => [...auction.ledger, entry];

/** The opening line: the price the bank starts the bidding at. */
export const openingLedgerEntry = (startPrice: number): AuctionLedgerEntry => ({
  kind: AuctionLedgerKind.Start,
  playerId: null,
  amount: startPrice,
});
