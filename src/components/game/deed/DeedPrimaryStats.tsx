import { formatMoney } from '../../../shared/utils/money.utils';

interface DeedPrimaryStatsProps {
  currencySymbol: string;
  mortgageValue: number;
  price: number;
}

/**
 * Price and mortgage value - shown on every ownable space.
 *
 * 'Site value' named a kind of square, on a card that is also the deed for a
 * railway and a utility. 'Price' is what the printed deed says, and it is true
 * of all three in every edition.
 */
export function DeedPrimaryStats({
  currencySymbol,
  mortgageValue,
  price,
}: DeedPrimaryStatsProps) {
  return (
    <div className="deed-primary-stats">
      <span>
        Price<strong>{formatMoney(price, currencySymbol)}</strong>
      </span>
      <span>
        Mortgage value<strong>{formatMoney(mortgageValue, currencySymbol)}</strong>
      </span>
    </div>
  );
}
