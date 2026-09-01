import type {
  AuctionBidderViewModel,
  AuctionDecisionViewModel,
  AuctionLedgerLineViewModel,
  BidFieldState,
} from '../../components/game/panels/panels.interfaces';
import { bidBlockedReason, minimumBidFor } from '../../domain/rules/auctionBids.utils';
import { PendingDecisionType } from '../../domain/types/game.enums';
import type {
  AuctionState,
  GameState,
  PlayerId,
} from '../../domain/types/game.interfaces';
import type { KeyedBidInput } from './auctionBid.interfaces';
import type { TokenFinder } from './gameView.interfaces';

/**
 * The auction panel's view model.
 *
 * Its own file rather than another entry in decisionViewModel.selectors, which
 * was itself split out of gameView.selectors for length - the auction needs the
 * resolved log and the prefilled bid field, and that is more than one case's worth.
 *
 * The panel shows the deed, so the space travels with the decision: the modal
 * covers the board, and a bidder deciding what a site is worth cannot go and
 * look at it.
 */

const bidderViewModel = (
  game: GameState,
  findToken: TokenFinder,
  playerId: PlayerId
): AuctionBidderViewModel => {
  const player = game.players[playerId];

  return {
    playerId,
    name: player?.name ?? '',
    token: player ? findToken(player.tokenId) : undefined,
    cash: player?.cash ?? 0,
  };
};

export const selectAuctionDecision = (
  game: GameState,
  findToken: TokenFinder
): AuctionDecisionViewModel | null => {
  const auction = game.auctionState;
  if (!auction) {
    return null;
  }

  const activeBidderId = auction.activeBidderOrder[auction.activeBidderIndex];
  const space = game.board.find((candidate) => candidate.id === auction.spaceId);
  // One view model per eligible bidder, built once: a log of twenty lines is a
  // handful of players repeated.
  const byId = new Map(
    auction.activeBidderOrder.map((playerId) => [
      playerId,
      bidderViewModel(game, findToken, playerId),
    ])
  );
  // A bidder who has since left the game still owns their line in the log.
  const bidderFor = (playerId: PlayerId): AuctionBidderViewModel =>
    byId.get(playerId) ?? bidderViewModel(game, findToken, playerId);

  const ledger: AuctionLedgerLineViewModel[] = auction.ledger.map((entry) => ({
    kind: entry.kind,
    bidder: entry.playerId ? bidderFor(entry.playerId) : null,
    amount: entry.amount,
  }));

  return {
    type: PendingDecisionType.AuctionBid,
    // The board always has the space: even a building auction carries the site
    // whose build request set the opening price.
    space: space ?? game.board[0],
    spaceName: space?.name ?? '',
    buildingKind: auction.buildingKind,
    activeBidderName: game.players[activeBidderId]?.name ?? '',
    activeBidder: bidderFor(activeBidderId),
    highestBid: auction.highestBid,
    minimumBid: minimumBidFor(auction),
    ledger,
    auction,
  };
};

/**
 * Which moment of which auction a typed bid belongs to.
 *
 * The bidder and the standing high bid are both in it, because both change the
 * minimum: a typed amount survives while the player is still deciding and goes
 * stale the instant anything moves.
 */
export const auctionBidKey = (auction: AuctionState): string =>
  `${auction.id}:${auction.activeBidderOrder[auction.activeBidderIndex]}:${auction.highestBid}`;

/**
 * The bid field, prefilled.
 *
 * A typed amount counts only while its key still matches; otherwise the field
 * shows the minimum legal bid. That is the whole prefill - no effect, no reset,
 * and it re-prefills by itself as the turn moves round the bidders and as each
 * queued auction opens.
 */
export const selectBidField = (
  auction: AuctionState,
  bidderCash: number,
  typed: KeyedBidInput | null
): BidFieldState => {
  const minimumBid = minimumBidFor(auction);
  const amount =
    typed && typed.key === auctionBidKey(auction) ? typed.amount : minimumBid;

  return {
    amount,
    minimumBid,
    maximumBid: bidderCash,
    blockedReason: bidBlockedReason(auction, bidderCash, amount),
  };
};
