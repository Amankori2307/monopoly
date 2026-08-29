import { formatMoney } from '../../../shared/utils/money.utils';

interface DeedPrimaryStatsProps {
  currencySymbol: string;
  mortgageValue: number;
  price: number;
}

/** Site value and mortgage value - shown on every ownable space. */
export function DeedPrimaryStats({
  currencySymbol,
  mortgageValue,
  price,
}: DeedPrimaryStatsProps) {
  return (
    <div className="deed-primary-stats">
      <span>
        Site value<strong>{formatMoney(price, currencySymbol)}</strong>
      </span>
      <span>
        Mortgage value<strong>{formatMoney(mortgageValue, currencySymbol)}</strong>
      </span>
    </div>
  );
}
