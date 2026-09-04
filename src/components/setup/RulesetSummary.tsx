import {
  JAIL_FINE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../../domain/constants/game.constants';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { formatMoney } from '../../shared/utils/money.utils';

interface RulesetSummaryProps {
  currencySymbol: string;
}

/**
 * The ruleset at a glance, quoted from the constants rather than from copy, so
 * the setup screen cannot drift from the game it is about to start.
 *
 * It replaced a "Locked v1 scope" table that told the player how the app was
 * built - Persistence: LocalStorage - and had gone stale besides: it still said
 * the Speed Die was "planned later" while its own toggle sat on the same screen.
 * These are the four numbers someone actually wants before sitting down.
 */
export function RulesetSummary({ currencySymbol }: RulesetSummaryProps) {
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['Players', `${MIN_PLAYERS} to ${MAX_PLAYERS}`],
    ['Starting cash', formatMoney(STARTING_CASH, currencySymbol)],
    ['GO salary', formatMoney(PASS_GO_AMOUNT, currencySymbol)],
    ['Jail fine', formatMoney(JAIL_FINE, currencySymbol)],
  ];

  return (
    <aside className="ruleset-glance" data-testid={TEST_IDS.rulesetGlance}>
      <p className="ruleset-glance-title">At a glance</p>
      <dl className="ruleset-glance-rows">
        {rows.map(([label, value]) => (
          <div className="ruleset-glance-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
