import diceRollSound from '../../assets/audio/dice-roll.wav';
import { scopedTestId, TEST_IDS } from '../../shared/constants/testIds.constants';
import { useDiceRoller } from './hooks/useDiceRoller';

interface DiceDockProps {
  canRoll: boolean;
  lastRoll: number[] | null;
  onRoll: () => void;
  rollLabel: string;
}

interface DieProps {
  index: number;
  isRolling: boolean;
  value: number;
}

function Die({ index, isRolling, value }: DieProps) {
  return (
    <div
      aria-label={`${value}`}
      className={`die-face face-${value} ${isRolling ? 'is-rolling' : ''}`}
      data-testid={scopedTestId(TEST_IDS.dieFace, index)}
    >
      {Array.from({ length: value }, (_, pipIndex) => (
        <span className={`pip pip-${pipIndex + 1}`} key={pipIndex} />
      ))}
    </div>
  );
}

/** Markup only - the animation and timing live in useDiceRoller. */
export function DiceDock({ canRoll, lastRoll, onRoll, rollLabel }: DiceDockProps) {
  const { displayValues, isRolling, roll } = useDiceRoller({
    canRoll,
    lastRoll,
    onRoll,
    soundSrc: diceRollSound,
  });

  return (
    <section aria-label="Dice roller" className="dice-dock" data-testid={TEST_IDS.diceDock}>
      <div aria-live="polite" className="dice-pair">
        <Die index={0} isRolling={isRolling} value={displayValues[0]} />
        <Die index={1} isRolling={isRolling} value={displayValues[1]} />
      </div>
      <button
        className="dice-roll-button"
        data-testid={TEST_IDS.rollButton}
        disabled={!canRoll || isRolling}
        onClick={roll}
        type="button"
      >
        {isRolling ? 'Rolling…' : rollLabel}
      </button>
    </section>
  );
}
