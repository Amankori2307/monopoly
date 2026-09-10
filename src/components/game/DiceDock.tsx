import { TEST_IDS } from '../../shared/constants/testIds.constants';
import type { UseDiceRollerResult } from './hooks/useDiceRoller';
import { type SpeedDieFace } from '../../domain/types/game.enums';
import { DicePair } from './DicePair';

interface DiceDockProps {
  canRoll: boolean;
  /** The one roller, owned by GameSidebar. See below. */
  dice: UseDiceRollerResult;
  rollLabel: string;
  /** The Speed Die's face, when this game is playing with one. */
  speedDieFace: SpeedDieFace | null;
}

/**
 * The dice and the button that throws them.
 *
 * It used to call `useDiceRoller` itself. It cannot any more, because the phone
 * draws the same throw a second time between the two columns of player cards -
 * and the hook plays the roll SOUND, so two of them would sound the roll twice.
 * `GameSidebar` owns the one roller and hands the result to both mounts.
 *
 * The button stays here, on every viewport. `controls.spec.ts` requires every
 * control in this row to be exactly 44px tall, and the HUD's middle column is
 * about 90px wide - which cannot hold a 44px control with a real label on it.
 */
export function DiceDock({ canRoll, dice, rollLabel, speedDieFace }: DiceDockProps) {
  const { displayValues, isRolling, isSubmitting, roll } = dice;

  return (
    <section
      aria-label="Dice roller"
      className="dice-dock"
      data-testid={TEST_IDS.diceDock}
    >
      <DicePair
        displayValues={displayValues}
        isRolling={isRolling}
        scope="dock"
        speedDieFace={speedDieFace}
      />
      <button
        className="dice-roll-button"
        data-testid={TEST_IDS.rollButton}
        // Both flags: the animation, and this device's own in-flight lock.
        disabled={!canRoll || isRolling || isSubmitting}
        onClick={roll}
        type="button"
      >
        {isRolling || isSubmitting ? 'Rolling…' : rollLabel}
      </button>
    </section>
  );
}
