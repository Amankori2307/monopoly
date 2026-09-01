import { describe, expect, it } from 'vitest';
import { AuctionLedgerKind } from '../types/game.enums';
import type { AuctionState } from '../types/game.interfaces';
import {
  appendAuctionEntry,
  bidBlockedReason,
  minimumBidFor,
  openingLedgerEntry,
} from './auctionBids.utils';

const auction = (overrides: Partial<AuctionState> = {}): AuctionState => ({
  id: 'auction-1',
  spaceId: 'space-1',
  startPrice: 10,
  minIncrement: 1,
  activeBidderOrder: ['player-1', 'player-2'],
  activeBidderIndex: 0,
  highestBid: 0,
  highestBidderId: null,
  passedPlayerIds: [],
  ledger: [openingLedgerEntry(10)],
  ...overrides,
});

describe('minimumBidFor', () => {
  it('opens at the start price while nobody has bid', () => {
    expect(minimumBidFor(auction())).toBe(10);
  });

  it('is the standing bid plus the increment once bidding is under way', () => {
    expect(minimumBidFor(auction({ highestBid: 120 }))).toBe(121);
  });

  // A building auction opens at the site's printed cost, which is well above
  // the property auction's ₹10 - so the floor is the higher of the two.
  it('never drops below the start price', () => {
    expect(minimumBidFor(auction({ startPrice: 50, highestBid: 20 }))).toBe(50);
  });
});

describe('bidBlockedReason', () => {
  it('allows a bid at exactly the minimum', () => {
    expect(bidBlockedReason(auction({ highestBid: 100 }), 500, 101)).toBeNull();
  });

  it('allows a bid of everything the player holds', () => {
    expect(bidBlockedReason(auction(), 300, 300)).toBeNull();
  });

  it('blocks a bid below the minimum, and says what the minimum is', () => {
    expect(bidBlockedReason(auction({ highestBid: 100 }), 500, 100)).toBe(
      'Bid must be at least 101.'
    );
  });

  it('blocks a bid the player cannot afford', () => {
    expect(bidBlockedReason(auction(), 90, 100)).toBe('Bid exceeds available cash.');
  });

  // An emptied number input reads as NaN, which would otherwise slip past both
  // comparisons - NaN is neither less than the minimum nor more than the cash.
  it('blocks an empty field rather than letting NaN through', () => {
    expect(bidBlockedReason(auction(), 500, Number.NaN)).toBe('Enter a bid.');
  });

  it('reports the shortfall before the cash, so the player raises once', () => {
    expect(bidBlockedReason(auction({ highestBid: 100 }), 5, 10)).toBe(
      'Bid must be at least 101.'
    );
  });
});

describe('the ledger', () => {
  it('opens on the start price, belonging to nobody', () => {
    expect(openingLedgerEntry(10)).toEqual({
      kind: AuctionLedgerKind.Start,
      playerId: null,
      amount: 10,
    });
  });

  it('appends oldest first, without mutating what it was given', () => {
    const before = auction();
    const ledger = appendAuctionEntry(before, {
      kind: AuctionLedgerKind.Bid,
      playerId: 'player-1',
      amount: 20,
    });

    expect(ledger.map((entry) => entry.kind)).toEqual(['start', 'bid']);
    expect(before.ledger).toHaveLength(1);
  });
});
