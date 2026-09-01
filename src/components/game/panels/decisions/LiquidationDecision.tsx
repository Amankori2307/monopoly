import type { MortgageableSite } from '../../../../domain/rules/holdings.utils';
import type { SpaceId } from '../../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';

interface LiquidationDecisionProps {
  amountDue: number;
  canSettle: boolean;
  creditorName: string | null;
  currencySymbol: string;
  /** True when the debt is beyond the player's cash and everything they could raise. */
  isBankrupt: boolean;
  mortgageableSites: MortgageableSite[];
  onDeclareBankruptcy: () => void;
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
  isBankrupt,
  mortgageableSites,
  onDeclareBankruptcy,
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
        /* Nothing left to mortgage and the debt still unmet: that is what
           bankruptcy means, so offer it rather than stranding the player. */
        <p className="liquidation-dead-end" data-testid={TEST_IDS.liquidationDeadEnd}>
          {playerName} has nothing left to mortgage and cannot cover this debt.
          {creditorName
            ? ` Everything they hold passes to ${creditorName}.`
            : ' Their sites return to the Bank.'}
        </p>
      )}

      {/* Owing more than you hold is what bankruptcy means, so the only button
          offered then is the one that acts on it. */}
      {isBankrupt ? (
        <button
          className="primary-button is-bankruptcy"
          data-testid={TEST_IDS.declareBankruptcy}
          onClick={onDeclareBankruptcy}
          type="button"
        >
          Declare bankruptcy
        </button>
      ) : (
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
      )}
    </div>
  );
}
