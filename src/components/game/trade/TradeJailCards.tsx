import { CardDeck } from '../../../domain/types/game.enums';
import type { DeckCard } from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';

interface TradeJailCardsProps {
  cards: DeckCard[];
  onChange: (count: number) => void;
  selectedCount: number;
  /** Which half of the deal this is, so the controls get unique ids. */
  side: string;
}

/**
 * The Get Out of Jail Free cards a player holds, as the cards themselves.
 *
 * They were a number input, which told a player nothing about what they were
 * buying. Each card wears its deck's colour, because that is the one way they
 * differ: a Chance card has to go back to Chance.
 *
 * **Selection is the first N, and the UI must not pretend otherwise.** The engine
 * moves `jailFreeCards.slice(0, N)` (tradeSettlement.utils), so clicking the Nth
 * card puts exactly those N into the deal. Offering a per-card checkbox would
 * let a player pick the second and keep the first, which the engine cannot do.
 */
export function TradeJailCards({
  cards,
  onChange,
  selectedCount,
  side,
}: TradeJailCardsProps) {
  return (
    <div className="trade-jail-cards">
      <p className="trade-field-label">Get Out of Jail Free</p>
      <ul className="trade-jail-list">
        {cards.map((card, index) => {
          // The first N are the ones that move, so this card being in the deal
          // means every card before it is too.
          const isGoing = index < selectedCount;
          const nextCount = isGoing ? index : index + 1;

          return (
            <li key={card.id}>
              <button
                aria-pressed={isGoing}
                className={`trade-jail-card ${
                  card.deck === CardDeck.Chance ? 'is-chance' : 'is-chest'
                } ${isGoing ? 'is-going' : ''}`}
                data-testid={scopedTestId(TEST_IDS.tradeJailCard, `${side}-${index}`)}
                onClick={() => onChange(nextCount)}
                type="button"
              >
                <span className="eyebrow">
                  {card.deck === CardDeck.Chance ? 'Chance' : 'Community Chest'}
                </span>
                <span className="trade-jail-card-title">{card.title}</span>
                <span className="trade-jail-card-state">
                  {isGoing ? 'In the deal' : 'Keeping'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {/* The count is what the command carries, so it stays readable and
          testable even though the cards are what you click. */}
      <p
        className="trade-jail-count"
        data-testid={scopedTestId(TEST_IDS.tradeJailCards, side)}
      >
        {selectedCount} of {cards.length} going
      </p>
    </div>
  );
}
