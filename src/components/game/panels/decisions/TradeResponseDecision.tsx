import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';
import type { TradeSideSummary } from '../../trade/trade.interfaces';

interface TradeResponseDecisionProps {
  currencySymbol: string;
  /** What the recipient is being given. */
  incoming: TradeSideSummary;
  onAccept: () => void;
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
  onAccept,
  onReject,
  outgoing,
  recipientName,
}: TradeResponseDecisionProps) {
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

      {incoming.transferFee > 0 ? (
        <p className="trade-fee">
          Plus {formatMoney(incoming.transferFee, currencySymbol)} to the Bank in mortgage
          interest on what you receive.
        </p>
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
          onClick={onAccept}
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

function TradeSummaryColumn({ currencySymbol, heading, side }: TradeSummaryColumnProps) {
  const isEmpty = side.cash === 0 && side.siteNames.length === 0 && side.jailCards === 0;

  return (
    <section className="trade-column">
      <p className="trade-column-head">{heading}</p>
      <ul className="trade-sites">
        {side.cash > 0 ? <li>{formatMoney(side.cash, currencySymbol)}</li> : null}
        {side.siteNames.map((name) => (
          <li key={name}>{name}</li>
        ))}
        {side.jailCards > 0 ? (
          <li>
            {side.jailCards} Get Out of Jail Free card{side.jailCards > 1 ? 's' : ''}
          </li>
        ) : null}
        {isEmpty ? <li className="trade-empty">Nothing</li> : null}
      </ul>
    </section>
  );
}
