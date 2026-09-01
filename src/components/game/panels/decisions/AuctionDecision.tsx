import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';

interface AuctionDecisionProps {
  activeBidderName: string;
  bidAmount: number;
  currencySymbol: string;
  highestBid: number;
  minimumBid: number;
  onBid: () => void;
  onBidAmountChange: (amount: number) => void;
  onPass: () => void;
  spaceName: string;
}

export function AuctionDecision({
  activeBidderName,
  bidAmount,
  currencySymbol,
  highestBid,
  minimumBid,
  onBid,
  onBidAmountChange,
  onPass,
  spaceName,
}: AuctionDecisionProps) {
  return (
    <div className="auction-decision" data-testid={TEST_IDS.auctionDecision}>
      <h2>Auction</h2>
      <p>
        Bidding for <strong>{spaceName}</strong>. Current high bid:{' '}
        <strong>{formatMoney(highestBid, currencySymbol)}</strong>.
      </p>
      <p>
        Active bidder: <strong>{activeBidderName}</strong>
      </p>
      <label>
        Bid amount
        <input
          className="text-input"
          data-testid={TEST_IDS.bidInput}
          min={minimumBid}
          onChange={(event) => onBidAmountChange(Number(event.target.value))}
          type="number"
          value={bidAmount}
        />
      </label>
      <div className="button-row">
        <button
          className="primary-button"
          data-testid={TEST_IDS.submitBidButton}
          onClick={onBid}
          type="button"
        >
          Submit bid
        </button>
        <button
          className="secondary-button"
          data-testid={TEST_IDS.passAuctionButton}
          onClick={onPass}
          type="button"
        >
          Pass
        </button>
      </div>
    </div>
  );
}
