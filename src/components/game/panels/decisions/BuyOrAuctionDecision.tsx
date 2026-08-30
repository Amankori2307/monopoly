import type { OwnableSpace } from '../../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';
import { SpaceCard } from '../../deed/SpaceCard';

interface BuyOrAuctionDecisionProps {
  currencySymbol: string;
  onBuy: () => void;
  onDecline: () => void;
  playerName: string;
  space: OwnableSpace;
}

const HEADING_ID = 'buy-decision-title';

/**
 * Two columns: the site card on one side, the choice on the other. The card is
 * a direct grid child - it brings its own surface, so it needs no wrapper.
 */
export function BuyOrAuctionDecision({
  currencySymbol,
  onBuy,
  onDecline,
  playerName,
  space,
}: BuyOrAuctionDecisionProps) {
  return (
    <div className="buy-decision" data-testid={TEST_IDS.buyDecision}>
      <SpaceCard currencySymbol={currencySymbol} headingId={HEADING_ID} space={space} />

      <div className="buy-decision-choice">
        {/* The card names the space, so the copy here states the choice only. */}
        <p className="decision-lede">
          {playerName} landed here. Buy it, or send it to auction.
        </p>
        <div className="buy-decision-buttons">
          <button
            className="primary-button"
            data-testid={TEST_IDS.buyButton}
            onClick={onBuy}
            type="button"
          >
            Buy for {formatMoney(space.price, currencySymbol)}
          </button>
          <button
            className="secondary-button"
            data-testid={TEST_IDS.declineButton}
            onClick={onDecline}
            type="button"
          >
            Decline and auction
          </button>
        </div>
      </div>
    </div>
  );
}
