import type { AuctionBidderViewModel, BidFieldState } from '../panels.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';

interface AuctionBidFormProps {
  bidder: AuctionBidderViewModel;
  currencySymbol: string;
  field: BidFieldState;
  onBid: () => void;
  onBidAmountChange: (amount: number) => void;
  onPass: () => void;
}

/** Raises offered as one tap each. Enough to move an auction, not so many that
 *  the row wraps. */
const RAISE_STEPS = [10, 50, 100];

const BID_INPUT_ID = 'auction-bid-amount';

/**
 * The bid itself.
 *
 * The field arrives holding the minimum legal bid, which is the fix for the
 * thing that made this panel unusable: it used to open at 10 and never move, so
 * with the high bid at 100 the player had to guess a legal number and was shown
 * an error for getting it wrong. Submit is disabled with the reason stated
 * instead - and the reason comes from `bidBlockedReason`, the same function the
 * engine throws from, so the button and the rule cannot drift apart.
 *
 * Who is bidding is not said here at all - the log's last line says it, and the
 * panel is a fixed height, so every duplicate came straight out of the log's
 * room.
 */
export function AuctionBidForm({
  bidder,
  currencySymbol,
  field,
  onBid,
  onBidAmountChange,
  onPass,
}: AuctionBidFormProps) {
  return (
    <div className="auction-bid-form">
      <div className="auction-bid-row">
        {/* Labelled by attribute rather than by a visible label: the log's last
            line already says whose bid this is, and a second heading over the
            field said it a third time. */}
        <input
          aria-describedby={field.blockedReason ? TEST_IDS.auctionBidBlocked : undefined}
          aria-label={`${bidder.name}'s bid`}
          className="text-input"
          data-testid={TEST_IDS.bidInput}
          id={BID_INPUT_ID}
          max={field.maximumBid}
          min={field.minimumBid}
          onChange={(event) => onBidAmountChange(Number(event.target.value))}
          type="number"
          value={field.amount}
        />
        {RAISE_STEPS.map((step) => (
          <button
            className="chip-button"
            data-testid={TEST_IDS.auctionRaise}
            // A raise past the bidder's cash is not a bid they could make.
            disabled={field.amount + step > field.maximumBid}
            key={step}
            onClick={() => onBidAmountChange(field.amount + step)}
            type="button"
          >
            {/* A delta, not an amount: the field beside it carries the symbol,
                and four chips wide enough to print it wrapped onto a second
                row - which came out of the ledger's height. */}
            +{step}
          </button>
        ))}
        <button
          className="chip-button"
          data-testid={TEST_IDS.auctionAllIn}
          disabled={field.maximumBid < field.minimumBid}
          onClick={() => onBidAmountChange(field.maximumBid)}
          type="button"
        >
          All in
        </button>
      </div>

      {field.blockedReason ? (
        <p
          className="auction-bid-blocked"
          data-testid={TEST_IDS.auctionBidBlocked}
          id={TEST_IDS.auctionBidBlocked}
        >
          {field.blockedReason}
        </p>
      ) : (
        <p className="auction-bid-hint">
          Minimum {formatMoney(field.minimumBid, currencySymbol)} · holds{' '}
          {formatMoney(field.maximumBid, currencySymbol)}
        </p>
      )}

      <div className="auction-bid-actions">
        <button
          className="primary-button"
          data-testid={TEST_IDS.submitBidButton}
          disabled={field.blockedReason !== null}
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
