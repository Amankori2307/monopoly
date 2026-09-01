import {
  JAIL_FINE,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../../domain/constants/game.constants';
import { formatMoney } from '../../shared/utils/money.utils';

interface RulesetSummaryProps {
  currencySymbol: string;
  themeName: string;
}

/**
 * The headline economics, quoted from the constants rather than the copy, so
 * the setup screen cannot drift from the ruleset it is about to start.
 */
export function RulesetSummary({ currencySymbol, themeName }: RulesetSummaryProps) {
  return (
    <div className="summary-card">
      <h3>{themeName}</h3>
      <p className="helper-text">
        Starting cash {formatMoney(STARTING_CASH, currencySymbol)}, GO salary{' '}
        {formatMoney(PASS_GO_AMOUNT, currencySymbol)}, Jail fine{' '}
        {formatMoney(JAIL_FINE, currencySymbol)}.
      </p>
    </div>
  );
}
