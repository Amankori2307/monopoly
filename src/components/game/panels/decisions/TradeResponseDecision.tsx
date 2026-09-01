import { useState } from 'react';
import { MortgageChoice } from '../../../../domain/types/game.enums';
import type { SpaceId } from '../../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';
import { SpaceCard } from '../../deed/SpaceCard';
import type {
  IncomingMortgagedSite,
  TradeSideSummary,
} from '../../trade/trade.interfaces';

interface TradeResponseDecisionProps {
  currencySymbol: string;
  /** What the recipient is being given. */
  incoming: TradeSideSummary;
  /** Mortgaged sites among that, each needing a decision of its own. */
  incomingMortgaged: IncomingMortgagedSite[];
  onAccept: (choices: Record<SpaceId, MortgageChoice>) => void;
  onReject: () => void;
  /** What the recipient is being asked for. */
  outgoing: TradeSideSummary;
  recipientName: string;
}

/**
 * The offer, as the other player sees it: the same two sides, read-only.
 *
 * Deliberately not a second builder - the recipient cannot counter here. They
 * accept or they reject, and rejecting hands the turn straight back.
 */
export function TradeResponseDecision({
  currencySymbol,
  incoming,
  incomingMortgaged,
  onAccept,
  onReject,
  outgoing,
  recipientName,
}: TradeResponseDecisionProps) {
  // Keeping it mortgaged is the cheaper option, so it is the default - the
  // player has to ask to spend more.
  const [choices, setChoices] = useState<Record<SpaceId, MortgageChoice>>({});
  const choiceFor = (spaceId: SpaceId) => choices[spaceId] ?? MortgageChoice.Keep;

  const mortgageTotal = incomingMortgaged.reduce(
    (total, site) =>
      total +
      (choiceFor(site.spaceId) === MortgageChoice.Redeem
        ? site.redeemCost
        : site.keepCost),
    0
  );

  return (
    <div className="trade-response" data-testid={TEST_IDS.tradeResponse}>
      <p className="eyebrow">Trade offer</p>
      <h2>{recipientName}, take this deal?</h2>

      <div className="trade-columns">
        <TradeSummaryColumn
          currencySymbol={currencySymbol}
          heading="You get"
          side={incoming}
        />
        <TradeSummaryColumn
          currencySymbol={currencySymbol}
          heading="You give"
          side={outgoing}
        />
      </div>

      {/* The printed rule gives the receiver the choice on each mortgaged site:
          clear it now, or pay the interest and take it as it stands. */}
      {incomingMortgaged.length > 0 ? (
        <div className="trade-mortgages" data-testid={TEST_IDS.tradeMortgageChoices}>
          <p className="deed-rent-title">Mortgaged sites coming to you</p>
          <ul>
            {incomingMortgaged.map((site) => (
              <li key={site.spaceId}>
                <span>{site.name}</span>
                <div className="trade-mortgage-options">
                  <label>
                    <input
                      checked={choiceFor(site.spaceId) === MortgageChoice.Keep}
                      data-testid={scopedTestId(TEST_IDS.tradeMortgageKeep, site.spaceId)}
                      name={`mortgage-${site.spaceId}`}
                      onChange={() =>
                        setChoices((current) => ({
                          ...current,
                          [site.spaceId]: MortgageChoice.Keep,
                        }))
                      }
                      type="radio"
                    />
                    Keep mortgaged — {formatMoney(site.keepCost, currencySymbol)}
                  </label>
                  <label>
                    <input
                      checked={choiceFor(site.spaceId) === MortgageChoice.Redeem}
                      data-testid={scopedTestId(
                        TEST_IDS.tradeMortgageRedeem,
                        site.spaceId
                      )}
                      name={`mortgage-${site.spaceId}`}
                      onChange={() =>
                        setChoices((current) => ({
                          ...current,
                          [site.spaceId]: MortgageChoice.Redeem,
                        }))
                      }
                      type="radio"
                    />
                    Pay it off — {formatMoney(site.redeemCost, currencySymbol)}
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <p className="trade-fee" data-testid={TEST_IDS.tradeMortgageTotal}>
            {formatMoney(mortgageTotal, currencySymbol)} to the Bank on top of the deal.
          </p>
        </div>
      ) : null}

      <div className="button-row">
        <button
          className="secondary-button"
          data-testid={TEST_IDS.tradeReject}
          onClick={onReject}
          type="button"
        >
          Reject
        </button>
        <button
          className="primary-button"
          data-testid={TEST_IDS.tradeAccept}
          onClick={() => onAccept(choices)}
          type="button"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

interface TradeSummaryColumnProps {
  currencySymbol: string;
  heading: string;
  side: TradeSideSummary;
}

/**
 * One side of the deal, as real title deeds.
 *
 * This is where a player commits, and it used to be a list of bare names - so
 * you could agree to take a mortgaged site with houses' worth of rent you would
 * never collect, and nothing on screen said so. Read-only, so the deeds are
 * simply stacked rather than pickable.
 */
function TradeSummaryColumn({ currencySymbol, heading, side }: TradeSummaryColumnProps) {
  const isEmpty = side.cash === 0 && side.sites.length === 0 && side.jailCards === 0;

  return (
    <section className="trade-column">
      <p className="trade-column-head">{heading}</p>

      <ul className="trade-summary-lines">
        {side.cash > 0 ? <li>{formatMoney(side.cash, currencySymbol)}</li> : null}
        {side.jailCards > 0 ? (
          <li>
            {side.jailCards} Get Out of Jail Free card{side.jailCards > 1 ? 's' : ''}
          </li>
        ) : null}
        {isEmpty ? <li className="trade-empty">Nothing</li> : null}
      </ul>

      {side.sites.length > 0 ? (
        <div
          className="trade-deed-stack is-readonly"
          data-testid={scopedTestId(TEST_IDS.tradeDeedStack, heading)}
        >
          {side.sites.map((entry) => (
            <article className="trade-deed" key={entry.space.id}>
              <SpaceCard
                currencySymbol={currencySymbol}
                headingId={`trade-response-${entry.space.id}`}
                ownership={entry.ownership}
                space={entry.space}
              />
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
