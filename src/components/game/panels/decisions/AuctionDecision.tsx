import type { BuildingKind } from '../../../../domain/types/game.enums';
import type { BoardSpace } from '../../../../domain/types/game.interfaces';
import type {
  AuctionBidderViewModel,
  AuctionLedgerLineViewModel,
  BidFieldState,
} from '../panels.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { SpaceCard } from '../../deed/SpaceCard';
import { AuctionBidForm } from './AuctionBidForm';
import { AuctionLedger } from './AuctionLedger';

interface AuctionDecisionProps {
  activeBidder: AuctionBidderViewModel;
  bidField: BidFieldState;
  /** Set when a house or hotel is for sale, not the site itself. */
  buildingKind: BuildingKind | undefined;
  currencySymbol: string;
  ledger: AuctionLedgerLineViewModel[];
  onBid: () => void;
  onBidAmountChange: (amount: number) => void;
  onPass: () => void;
  space: BoardSpace;
}

const HEADING_ID = 'auction-decision-title';

/**
 * Two columns: the deed on the left, the bidding on the right.
 *
 * The deed is the whole basis for deciding what a site is worth, and this modal
 * covers the board - so it travels with the decision rather than being named in
 * a sentence, exactly as the buy decision does.
 *
 * **The panel is exactly one deed card tall and does not grow.** It used to
 * stretch with the ledger, so the modal moved every time somebody bid and the
 * buttons walked down the screen. The ledger is the one row that gives: it takes
 * whatever height is left and scrolls, pinned to the newest bid.
 *
 * Nothing on the right is said twice. There is no heading (the card names the
 * space in bigger type a few pixels away), no bidder roster and no label on the
 * bid field - the log's own last line, "<name> bidding...", is where whose turn
 * it is gets said. Each duplicate cost the log rows it needed.
 */
export function AuctionDecision({
  activeBidder,
  bidField,
  buildingKind,
  currencySymbol,
  ledger,
  onBid,
  onBidAmountChange,
  onPass,
  space,
}: AuctionDecisionProps) {
  return (
    <div className="auction-decision" data-testid={TEST_IDS.auctionDecision}>
      {/* A building auction has no deed of its own: the card shows the site
          whose build request set the opening price, for context. */}
      <SpaceCard currencySymbol={currencySymbol} headingId={HEADING_ID} space={space} />

      <div className="auction-bidding">
        <p className="eyebrow auction-eyebrow">
          {buildingKind
            ? `Auction · the bank's last ${buildingKind}`
            : 'Auction · highest bid takes it'}
        </p>

        <AuctionLedger
          activeBidder={activeBidder}
          currencySymbol={currencySymbol}
          lines={ledger}
        />
        <AuctionBidForm
          bidder={activeBidder}
          currencySymbol={currencySymbol}
          field={bidField}
          onBid={onBid}
          onBidAmountChange={onBidAmountChange}
          onPass={onPass}
        />
      </div>
    </div>
  );
}
