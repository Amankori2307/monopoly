import { useState } from 'react';
import type { SpaceId, TradeState } from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import type { TradeBuilderViewModel, TradePartyViewModel } from './trade.interfaces';
import { TradeDeedStack } from './TradeDeedStack';
import { TradeJailCards } from './TradeJailCards';

interface TradeBuilderProps {
  builder: TradeBuilderViewModel;
  currencySymbol: string;
  onCancel: () => void;
  onPropose: (trade: TradeState) => void;
}

/**
 * The offer builder: your side and theirs, assembled together.
 *
 * Two columns rather than a wizard, because a trade is only ever judged as a
 * whole - what you give against what you get. The form state is local: the
 * modal discards on close, so there is nothing to keep in the store.
 *
 * It offers no opinion on whether a trade is fair. Any price both players agree
 * on is legal, which is the one rule this screen must not get in the way of.
 */
export function TradeBuilder({
  builder,
  currencySymbol,
  onCancel,
  onPropose,
}: TradeBuilderProps) {
  const [offeredSpaceIds, setOfferedSpaceIds] = useState<SpaceId[]>([]);
  const [requestedSpaceIds, setRequestedSpaceIds] = useState<SpaceId[]>([]);
  const [offeredCash, setOfferedCash] = useState(0);
  const [requestedCash, setRequestedCash] = useState(0);
  const [offeredJailCards, setOfferedJailCards] = useState(0);
  const [requestedJailCards, setRequestedJailCards] = useState(0);

  const trade: TradeState = {
    proposerPlayerId: builder.proposer.playerId,
    recipientPlayerId: builder.recipient.playerId,
    offeredCash,
    requestedCash,
    offeredSpaceIds,
    requestedSpaceIds,
    offeredJailCards,
    requestedJailCards,
  };

  const movesSomething =
    offeredCash > 0 ||
    requestedCash > 0 ||
    offeredSpaceIds.length > 0 ||
    requestedSpaceIds.length > 0 ||
    offeredJailCards > 0 ||
    requestedJailCards > 0;

  return (
    <div className="trade-builder" data-testid={TEST_IDS.tradeBuilder}>
      <p className="eyebrow">Offer a deal</p>
      <h2>
        {builder.proposer.name} and {builder.recipient.name}
      </h2>

      <div className="trade-columns">
        <TradeColumn
          cash={offeredCash}
          currencySymbol={currencySymbol}
          heading="You give"
          jailCards={offeredJailCards}
          onCashChange={setOfferedCash}
          onJailCardsChange={setOfferedJailCards}
          onToggleSite={(spaceId) => setOfferedSpaceIds(toggle(offeredSpaceIds, spaceId))}
          party={builder.proposer}
          selectedSpaceIds={offeredSpaceIds}
          side="offer"
        />
        <TradeColumn
          cash={requestedCash}
          currencySymbol={currencySymbol}
          heading="You get"
          jailCards={requestedJailCards}
          onCashChange={setRequestedCash}
          onJailCardsChange={setRequestedJailCards}
          onToggleSite={(spaceId) =>
            setRequestedSpaceIds(toggle(requestedSpaceIds, spaceId))
          }
          party={builder.recipient}
          selectedSpaceIds={requestedSpaceIds}
          side="request"
        />
      </div>

      <div className="button-row">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="primary-button"
          data-testid={TEST_IDS.tradePropose}
          disabled={!movesSomething}
          onClick={() => onPropose(trade)}
          title={movesSomething ? '' : 'A trade has to move something'}
          type="button"
        >
          Send offer
        </button>
      </div>
    </div>
  );
}

const toggle = (ids: SpaceId[], spaceId: SpaceId): SpaceId[] =>
  ids.includes(spaceId) ? ids.filter((id) => id !== spaceId) : [...ids, spaceId];

interface TradeColumnProps {
  cash: number;
  currencySymbol: string;
  heading: string;
  jailCards: number;
  onCashChange: (amount: number) => void;
  onJailCardsChange: (count: number) => void;
  onToggleSite: (spaceId: SpaceId) => void;
  party: TradePartyViewModel;
  selectedSpaceIds: SpaceId[];
  /** Which half of the deal this column is, so its controls get unique ids. */
  side: string;
}

/** One player's half of the deal. Identical either way round, by design. */
function TradeColumn({
  cash,
  currencySymbol,
  heading,
  jailCards,
  onCashChange,
  onJailCardsChange,
  onToggleSite,
  party,
  selectedSpaceIds,
  side,
}: TradeColumnProps) {
  const cashId = `trade-cash-${side}`;

  return (
    <section
      className="trade-column"
      data-testid={scopedTestId(TEST_IDS.tradeColumn, side)}
    >
      <p className="trade-column-head">
        {/* The token colour is theme data, so it is inline here the same way it
            is on the board and the player card. */}
        <span className="trade-column-dot" style={{ backgroundColor: party.color }} />
        {heading} — {party.name}
      </p>
      <p className="trade-column-cash">Has {formatMoney(party.cash, currencySymbol)}</p>

      <TradeDeedStack
        currencySymbol={currencySymbol}
        onToggle={onToggleSite}
        selectedSpaceIds={selectedSpaceIds}
        side={side}
        sites={party.sites}
      />

      <label className="trade-field" htmlFor={cashId}>
        Cash
        <input
          data-testid={scopedTestId(TEST_IDS.tradeCash, side)}
          id={cashId}
          max={party.cash}
          min={0}
          onChange={(event) => onCashChange(Math.max(0, Number(event.target.value) || 0))}
          type="number"
          value={cash}
        />
      </label>

      {party.jailFreeCards.length > 0 ? (
        <TradeJailCards
          cards={party.jailFreeCards}
          onChange={onJailCardsChange}
          selectedCount={jailCards}
          side={side}
        />
      ) : null}
    </section>
  );
}
