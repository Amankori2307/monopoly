import type { MortgageableSite } from '../../../../domain/rules/holdings.utils';
import type { SpaceId } from '../../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';

interface LiquidationDecisionProps {
  amountDue: number;
  canSettle: boolean;
  creditorName: string | null;
  currencySymbol: string;
  mortgageableSites: MortgageableSite[];
  onMortgageSite: (spaceId: SpaceId) => void;
  onSettleDebt: () => void;
  playerName: string;
  reason: string;
}

/**
 * A debt the player cannot yet pay, and the means to raise it.
 *
 * The sites are listed here rather than left to the board because this modal is
 * deliberately non-dismissible and covers it - a player being asked for money
 * they do not have could not otherwise reach anything to mortgage.
 *
 * Keep the word "liquidation" in the heading: an e2e test matches the decision
 * modal's text against it.
 */
export function LiquidationDecision({
  amountDue,
  canSettle,
  creditorName,
  currencySymbol,
  mortgageableSites,
  onMortgageSite,
  onSettleDebt,
  playerName,
  reason,
}: LiquidationDecisionProps) {
  const hasSitesLeft = mortgageableSites.length > 0;

  return (
    <div className="liquidation" data-testid={TEST_IDS.liquidationDecision}>
      <p className="eyebrow">Asset liquidation</p>
      <h2>
        {playerName} owes {formatMoney(amountDue, currencySymbol)}
      </h2>
      <p className="liquidation-reason">
        {creditorName ? `Owed to ${creditorName}` : 'Owed to the Bank'} — {reason}.
      </p>

      {hasSitesLeft ? (
        <>
          <p className="deed-rent-title">Mortgage a site to raise cash</p>
          <ul className="liquidation-sites">
            {mortgageableSites.map((site) => (
              <li key={site.spaceId}>
                <span>{site.name}</span>
                <button
                  className="secondary-button"
                  data-testid={scopedTestId(TEST_IDS.liquidationMortgage, site.spaceId)}
                  onClick={() => onMortgageSite(site.spaceId)}
                  type="button"
                >
                  Mortgage for {formatMoney(site.mortgageValue, currencySymbol)}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        /* Nothing left to mortgage and the debt still unmet. Bankruptcy is the
           real answer and is not built yet, so say so rather than leaving the
           player staring at a modal with no way forward. */
        <p className="liquidation-dead-end" data-testid={TEST_IDS.liquidationDeadEnd}>
          {playerName} has nothing left to mortgage and cannot cover this debt. Bankruptcy
          is not implemented yet, so this game cannot continue from here.
        </p>
      )}

      <button
        className="primary-button"
        data-testid={TEST_IDS.liquidationSettle}
        disabled={!canSettle}
        onClick={onSettleDebt}
        title={canSettle ? '' : 'Raise the cash first'}
        type="button"
      >
        Pay {formatMoney(amountDue, currencySymbol)}
      </button>
    </div>
  );
}
