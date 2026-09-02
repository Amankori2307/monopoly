import diceRollSound from '../../../../assets/audio/dice-roll.wav';
import { JAIL_FINE, MAX_JAIL_TURNS } from '../../../../domain/constants/game.constants';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../../shared/utils/money.utils';
import { DieFace } from '../../DieFace';
import { useDiceRoller } from '../../hooks/useDiceRoller';

interface JailDecisionProps {
  /** Failed attempts so far, so the panel can say which one is next. */
  attemptsUsed: number;
  canUseJailCard: boolean;
  currencySymbol: string;
  /** The engine's last throw, which the dice settle on once the tumble ends. */
  lastRoll: number[] | null;
  onAttemptJailRoll: () => void;
  onPayFine: () => void;
  onUseJailCard: () => void;
  playerName: string;
}

/**
 * The three ways out of Jail, in the one place the player is looking.
 *
 * Trying for doubles used to be missing from here, and was only offered by the
 * dice dock — which this modal's backdrop covers. So a jailed player could not
 * reach it at all and was forced to pay the fine or spend a card, losing the
 * three free attempts the rules give them.
 *
 * The attempt counter is not decoration: the third failure is where the fine
 * stops being a choice, and a player deciding whether to risk another roll needs
 * to know which one they are on.
 *
 * **The dice are here too, and they are real dice.** The button used to dispatch
 * the command straight out, so a Jail roll had no tumble and no sound while
 * every other roll in the game had both - and the dock that would have shown
 * them is behind this modal's backdrop. It goes through the same `useDiceRoller`
 * the dock uses, so the two cannot drift apart in how a roll feels.
 */
export function JailDecision({
  attemptsUsed,
  canUseJailCard,
  currencySymbol,
  lastRoll,
  onAttemptJailRoll,
  onPayFine,
  onUseJailCard,
  playerName,
}: JailDecisionProps) {
  const attempt = Math.min(attemptsUsed + 1, MAX_JAIL_TURNS);
  const isLastAttempt = attempt === MAX_JAIL_TURNS;
  const { displayValues, isRolling, roll } = useDiceRoller({
    // The panel is only rendered while the attempt is still available, so
    // whether it may be taken is already decided by then.
    canRoll: true,
    lastRoll,
    onRoll: onAttemptJailRoll,
    soundSrc: diceRollSound,
  });

  return (
    <div className="jail-decision" data-testid={TEST_IDS.jailDecision}>
      <p className="eyebrow">In Jail</p>
      <h2>{playerName} can roll for it, pay, or use a card</h2>
      <p className="jail-attempt" data-testid={TEST_IDS.jailAttempt}>
        Attempt {attempt} of {MAX_JAIL_TURNS}.{' '}
        {isLastAttempt
          ? `Fail this one and the ${formatMoney(JAIL_FINE, currencySymbol)} fine is charged automatically.`
          : 'Rolling costs nothing.'}
      </p>

      <div aria-live="polite" className="jail-dice">
        <DieFace index={0} isRolling={isRolling} value={displayValues[0]} />
        <DieFace index={1} isRolling={isRolling} value={displayValues[1]} />
      </div>

      <div className="button-row">
        <button
          className="primary-button"
          data-testid={TEST_IDS.jailRollButton}
          disabled={isRolling}
          onClick={roll}
          type="button"
        >
          {isRolling ? 'Rolling…' : 'Roll for doubles'}
        </button>
        <button
          className="secondary-button"
          disabled={isRolling}
          onClick={onPayFine}
          type="button"
        >
          Pay {formatMoney(JAIL_FINE, currencySymbol)}
        </button>
        <button
          className="secondary-button"
          disabled={!canUseJailCard || isRolling}
          onClick={onUseJailCard}
          title={canUseJailCard ? '' : 'No Get Out of Jail Free card to use'}
          type="button"
        >
          Use jail card
        </button>
      </div>
    </div>
  );
}
