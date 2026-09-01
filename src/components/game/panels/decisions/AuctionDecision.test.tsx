import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../../domain/board/indiaEditionBoard';
import { indiaEditionTheme } from '../../../../domain/themes/indiaEditionTheme';
import {
  AuctionLedgerKind,
  BuildingKind,
  SpaceKind,
} from '../../../../domain/types/game.enums';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import type {
  AuctionBidderViewModel,
  AuctionLedgerLineViewModel,
  BidFieldState,
} from '../panels.interfaces';
import { AuctionDecision } from './AuctionDecision';

const street = indiaEditionBoard.find((space) => space.kind === SpaceKind.Street);
if (!street) {
  throw new Error('No street on the board');
}

const token = (index: number) => indiaEditionTheme.tokenCatalog[index];

const bidder = (
  name: string,
  overrides: Partial<AuctionBidderViewModel> = {}
): AuctionBidderViewModel => ({
  playerId: `player-${name}`,
  name,
  token: token(0),
  cash: 1500,
  ...overrides,
});

const ASHA = bidder('Asha', { token: token(0) });
const VIKRAM = bidder('Vikram', { token: token(1) });
const MEERA = bidder('Meera', { token: token(2) });

const LEDGER: AuctionLedgerLineViewModel[] = [
  { kind: AuctionLedgerKind.Start, bidder: null, amount: 10 },
  { kind: AuctionLedgerKind.Bid, bidder: ASHA, amount: 20 },
  { kind: AuctionLedgerKind.Bid, bidder: VIKRAM, amount: 50 },
  { kind: AuctionLedgerKind.Bid, bidder: MEERA, amount: 100 },
  { kind: AuctionLedgerKind.Pass, bidder: ASHA, amount: null },
  { kind: AuctionLedgerKind.Bid, bidder: VIKRAM, amount: 120 },
  { kind: AuctionLedgerKind.Pass, bidder: MEERA, amount: null },
];

const field = (overrides: Partial<BidFieldState> = {}): BidFieldState => ({
  amount: 121,
  minimumBid: 121,
  maximumBid: 1500,
  blockedReason: null,
  ...overrides,
});

const renderPanel = (overrides: Partial<Parameters<typeof AuctionDecision>[0]> = {}) => {
  const handlers = {
    onBid: vi.fn(),
    onBidAmountChange: vi.fn(),
    onPass: vi.fn(),
  };
  render(
    <AuctionDecision
      activeBidder={VIKRAM}
      bidField={field()}
      buildingKind={undefined}
      currencySymbol="₹"
      ledger={LEDGER}
      space={street}
      {...handlers}
      {...overrides}
    />
  );
  return handlers;
};

describe('AuctionDecision', () => {
  // The deed is the basis for deciding what a site is worth, and this modal
  // covers the board - so the card has to be here, not a name in a sentence.
  it('shows the deed for the site being auctioned', () => {
    renderPanel();

    expect(screen.getByTestId(TEST_IDS.spaceCard)).toBeInTheDocument();
    // Named once, by the card. The right-hand column deliberately does not
    // repeat it - that heading cost two lines of the ledger's room.
    expect(screen.getAllByText(street.name)).toHaveLength(1);
  });

  // A chat log, read top to bottom, ending on the line still being answered.
  it('reads the bidding back as the story of the auction', () => {
    renderPanel();

    expect(
      screen
        .getAllByTestId(TEST_IDS.auctionLogLine)
        .map((line) => line.textContent?.replace(/\s+/g, ' ').trim())
    ).toEqual([
      'Auction started at ₹10',
      '🐘 Asha bid ₹20',
      '🚂 Vikram bid ₹50',
      '🛺 Meera bid ₹100',
      '🐘 Asha passed',
      '🚂 Vikram bid ₹120',
      '🛺 Meera passed',
    ]);
    // The live line is the log's last, and is asserted on its own below - it
    // carries the active-bidder id rather than a history line's.
  });

  // The log's last line is the only place whose turn it is gets said.
  it('ends the log on whoever is bidding', () => {
    renderPanel();

    expect(screen.getByTestId(TEST_IDS.auctionActiveBidder)).toHaveTextContent(
      'Vikram bidding'
    );
  });

  it('shows the active bidder what they have to spend', () => {
    renderPanel();

    expect(screen.getByText(/holds ₹1500/)).toBeInTheDocument();
  });

  // No roster: who is out is what the log's own "passed" lines say.
  it('says who has dropped out in the log rather than on a chip', () => {
    renderPanel();

    expect(screen.getByTestId(TEST_IDS.auctionLog)).toHaveTextContent('Asha passed');
    expect(screen.getByTestId(TEST_IDS.auctionLog)).toHaveTextContent('Meera passed');
  });

  // The standing bid is the newest bid line, and the minimum implies it. It is
  // deliberately not restated anywhere else.
  it('leaves the standing bid to the log', () => {
    renderPanel();
    const log = screen.getByTestId(TEST_IDS.auctionLog);

    expect(log).toHaveTextContent('Vikram bid ₹120');
    expect(log).not.toHaveTextContent(/leading/i);
  });

  // The whole point of the rewrite: the field arrives legal.
  it('arrives holding the minimum legal bid', () => {
    renderPanel();

    expect(screen.getByTestId(TEST_IDS.bidInput)).toHaveValue(121);
  });

  it('submits what the field holds', () => {
    const handlers = renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.submitBidButton));

    expect(handlers.onBid).toHaveBeenCalledOnce();
  });

  it('passes on request', () => {
    const handlers = renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.passAuctionButton));

    expect(handlers.onPass).toHaveBeenCalledOnce();
  });

  it('raises by the chip that was tapped', () => {
    const handlers = renderPanel();

    fireEvent.click(screen.getAllByTestId(TEST_IDS.auctionRaise)[1]);

    expect(handlers.onBidAmountChange).toHaveBeenCalledWith(171);
  });

  it('bids everything on all in', () => {
    const handlers = renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.auctionAllIn));

    expect(handlers.onBidAmountChange).toHaveBeenCalledWith(1500);
  });

  it('will not offer a raise the bidder cannot afford', () => {
    renderPanel({ bidField: field({ amount: 90, maximumBid: 100 }) });
    const chips = screen.getAllByTestId(TEST_IDS.auctionRaise);

    expect(chips[0]).toBeEnabled();
    expect(chips[1]).toBeDisabled();
    expect(chips[2]).toBeDisabled();
  });

  /**
   * The panel refuses the bid rather than letting the engine throw, and the
   * wording is the engine's own - bidBlockedReason is shared by both.
   */
  it('disables Submit with the reason stated', () => {
    renderPanel({
      bidField: field({ amount: 50, blockedReason: 'Bid must be at least 121.' }),
    });

    expect(screen.getByTestId(TEST_IDS.submitBidButton)).toBeDisabled();
    expect(screen.getByTestId(TEST_IDS.auctionBidBlocked)).toHaveTextContent(
      'Bid must be at least 121.'
    );
  });

  it('leaves Pass available to a bidder who cannot afford to bid', () => {
    renderPanel({
      bidField: field({ maximumBid: 5, blockedReason: 'Bid exceeds available cash.' }),
    });

    expect(screen.getByTestId(TEST_IDS.passAuctionButton)).toBeEnabled();
  });

  it('states the minimum when the bid is legal', () => {
    renderPanel();

    expect(screen.getByText(/Minimum ₹121/)).toBeInTheDocument();
  });

  // A building auction has no deed of its own, so the copy has to say what is
  // actually for sale - the card beside it is the site that set the price.
  it('says a building is for sale when the bank is short of them', () => {
    renderPanel({ buildingKind: BuildingKind.House });

    expect(screen.getByText(/the bank's last house/i)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.spaceCard)).toBeInTheDocument();
  });
});
