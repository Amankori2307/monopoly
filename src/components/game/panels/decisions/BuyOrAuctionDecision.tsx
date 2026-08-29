import { formatMoney } from '../../../../shared/utils/money.utils';

interface BuyOrAuctionDecisionProps {
  currencySymbol: string;
  onBuy: () => void;
  onDecline: () => void;
  playerName: string;
  price: number;
  spaceName: string;
}

export function BuyOrAuctionDecision({
  currencySymbol,
  onBuy,
  onDecline,
  playerName,
  price,
  spaceName,
}: BuyOrAuctionDecisionProps) {
  return (
    <>
      <h2>Buy or auction</h2>
      <p>
        {playerName} landed on <strong>{spaceName}</strong> for{' '}
        <strong>{formatMoney(price, currencySymbol)}</strong>.
      </p>
      <div className="button-row">
        <button className="primary-button" onClick={onBuy} type="button">
          Buy
        </button>
        <button className="secondary-button" onClick={onDecline} type="button">
          Decline and auction
        </button>
      </div>
    </>
  );
}
