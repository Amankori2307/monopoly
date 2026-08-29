import { formatMoney } from '../../../../shared/utils/money.utils';

interface LiquidationDecisionProps {
  amountDue: number;
  currencySymbol: string;
  playerName: string;
}

export function LiquidationDecision({
  amountDue,
  currencySymbol,
  playerName,
}: LiquidationDecisionProps) {
  return (
    <>
      <h2>Asset liquidation required</h2>
      <p>
        {playerName} owes {formatMoney(amountDue, currencySymbol)}. Mortgage, building
        sales, and bankruptcy resolution are scaffolded next.
      </p>
    </>
  );
}
