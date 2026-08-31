import { TEST_IDS } from '../../../../shared/constants/testIds.constants';

interface CardDrawDecisionProps {
  cardDescription: string;
  cardTitle: string;
  deckLabel: string;
  onAcknowledge: () => void;
  playerName: string;
}

/**
 * The card a player just drew, shown before it acts on them.
 *
 * The engine deliberately stops after the draw: the effect is applied by
 * AcknowledgeCard, so this is not a notice about something that already
 * happened - nothing moves until the player confirms.
 */
export function CardDrawDecision({
  cardDescription,
  cardTitle,
  deckLabel,
  onAcknowledge,
  playerName,
}: CardDrawDecisionProps) {
  return (
    <div className="card-draw" data-testid={TEST_IDS.cardDrawDecision}>
      <p className="eyebrow">{deckLabel}</p>
      <h2 id="card-draw-title">{cardTitle}</h2>
      <p className="card-draw-description">{cardDescription}</p>
      <p className="card-draw-player">{playerName} drew this card.</p>
      <button
        className="primary-button"
        data-testid={TEST_IDS.acknowledgeCardButton}
        onClick={onAcknowledge}
        type="button"
      >
        OK
      </button>
    </div>
  );
}
