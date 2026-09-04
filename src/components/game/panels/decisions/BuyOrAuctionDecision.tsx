import type { OwnableSpace } from '../../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';
import { SpaceCard } from '../../deed/SpaceCard';

interface BuyOrAuctionDecisionProps {
  /** Why Buy is unavailable, or null when it is. Disables the button and says why. */
  buyBlockedReason: string | null;
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
  buyBlockedReason,
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
        {/* The reason is on the button as a title too, but a title is not
            readable on touch and not announced reliably - a player who cannot
            buy needs to be told why in the panel itself, or a disabled button
            looks like the game is broken. */}
        {buyBlockedReason ? (
          <p className="decision-blocked" data-testid={TEST_IDS.buyBlockedReason}>
            {buyBlockedReason}
          </p>
        ) : null}
        <div className="buy-decision-buttons">
          {/* Disabled with its reason rather than left live to fail: the same
              treatment the site panel already gives every property action. */}
          <button
            className="primary-button"
            data-testid={TEST_IDS.buyButton}
            disabled={buyBlockedReason !== null}
            onClick={onBuy}
            title={buyBlockedReason ?? undefined}
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
