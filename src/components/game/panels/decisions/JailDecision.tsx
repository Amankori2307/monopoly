import { JAIL_FINE } from '../../../../domain/constants/game.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';

interface JailDecisionProps {
  canUseJailCard: boolean;
  currencySymbol: string;
  onPayFine: () => void;
  onUseJailCard: () => void;
  playerName: string;
}

export function JailDecision({
  canUseJailCard,
  currencySymbol,
  onPayFine,
  onUseJailCard,
  playerName,
}: JailDecisionProps) {
  return (
    <>
      <h2>Jail choice</h2>
      <p>{playerName} is in Jail and must choose how to leave.</p>
      <div className="button-row">
        <button className="primary-button" onClick={onPayFine} type="button">
          Pay {formatMoney(JAIL_FINE, currencySymbol)}
        </button>
        <button
          className="secondary-button"
          disabled={!canUseJailCard}
          onClick={onUseJailCard}
          type="button"
        >
          Use jail card
        </button>
      </div>
    </>
  );
}
