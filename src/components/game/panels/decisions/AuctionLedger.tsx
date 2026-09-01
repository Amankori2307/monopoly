import { useEffect, useRef } from 'react';
import { AuctionLedgerKind } from '../../../../domain/types/game.enums';
import type {
  AuctionBidderViewModel,
  AuctionLedgerLineViewModel,
} from '../panels.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';

interface AuctionLedgerProps {
  /** Whose turn it is, so the log ends on the line still being answered. */
  activeBidder: AuctionBidderViewModel;
  currencySymbol: string;
  lines: AuctionLedgerLineViewModel[];
}

/**
 * The auction as a chat log: opened at, bid, passed, waiting on.
 *
 * Plain lines rather than cards or chips. This started out as a bordered box per
 * entry with a bidder roster above it, and the boxes were doing nothing the
 * sentences did not - a log people read top to bottom is the right shape for
 * "how did the bidding get here".
 *
 * It is also the only place the panel says whose turn it is: the last line is
 * "<name> bidding...", which replaced both a roster chip and a label on the bid
 * field that said the same thing two more times.
 *
 * The record is the auction's own, not a slice of the game history - the history
 * is prose shared with every other event and sits behind this modal.
 */
export function AuctionLedger({
  activeBidder,
  currencySymbol,
  lines,
}: AuctionLedgerProps) {
  const scroller = useRef<HTMLDivElement>(null);

  /**
   * Keeps the newest line in view.
   *
   * The panel is a fixed height, so a long auction scrolls - and without this it
   * stayed at the top, showing an opening bid of 10 while the standing bid was
   * 120. The latest line is the one a player is answering, so it is the one that
   * has to be on screen.
   */
  useEffect(() => {
    const element = scroller.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [lines.length]);

  return (
    <div
      aria-live="polite"
      className="auction-log"
      data-testid={TEST_IDS.auctionLog}
      ref={scroller}
    >
      {lines.map((line, index) => (
        <p
          className={`auction-log-line is-${line.kind}`}
          data-testid={TEST_IDS.auctionLogLine}
          // Lines are append-only and never reordered, so the position is a
          // stable identity - two identical bids are still two lines.
          key={`${line.kind}-${line.bidder?.playerId ?? 'bank'}-${index}`}
        >
          {line.kind === AuctionLedgerKind.Start ? (
            <>
              Auction started at{' '}
              <strong>{formatMoney(line.amount ?? 0, currencySymbol)}</strong>
            </>
          ) : (
            <>
              <span className="auction-log-who">
                {line.bidder?.token?.emoji} {line.bidder?.name}
              </span>{' '}
              {line.kind === AuctionLedgerKind.Pass ? (
                'passed'
              ) : (
                <>
                  bid <strong>{formatMoney(line.amount ?? 0, currencySymbol)}</strong>
                </>
              )}
            </>
          )}
        </p>
      ))}

      <p
        className="auction-log-line is-pending"
        data-testid={TEST_IDS.auctionActiveBidder}
      >
        <span className="auction-log-who">
          {activeBidder.token?.emoji} {activeBidder.name}
        </span>{' '}
        bidding&hellip;
      </p>
    </div>
  );
}
