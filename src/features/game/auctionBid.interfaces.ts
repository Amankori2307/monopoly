/** A typed bid, tagged with the moment of the auction it was typed at. */
export interface KeyedBidInput {
  /** See auctionBidKey: the auction, the bidder, and the standing high bid. */
  key: string;
  amount: number;
}
