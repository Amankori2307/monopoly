import diceRollSound from '../../assets/audio/dice-roll.wav';
import { SpeedDieFace } from '../../domain/types/game.enums';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { DieFace } from './DieFace';
import { useDiceRoller } from './hooks/useDiceRoller';

interface DiceDockProps {
  canRoll: boolean;
  lastRoll: number[] | null;
  /** Identifies the throw, so every device replays it exactly once. */
  lastRollId: string | null;
  onRoll: () => void;
  rollLabel: string;
  /** False when the player has muted the game. */
  soundEnabled: boolean;
  /** The Speed Die's face, when this game is playing with one. */
  speedDieFace: SpeedDieFace | null;
}

/** Markup only - the animation and timing live in useDiceRoller. */
export function DiceDock({
  canRoll,
  lastRoll,
  lastRollId,
  onRoll,
  rollLabel,
  soundEnabled,
  speedDieFace,
}: DiceDockProps) {
  const { displayValues, isRolling, isSubmitting, roll } = useDiceRoller({
    canRoll,
    lastRoll,
    lastRollId,
    onRoll,
    soundEnabled,
    soundSrc: diceRollSound,
  });

  return (
    <section
      aria-label="Dice roller"
      className="dice-dock"
      data-testid={TEST_IDS.diceDock}
    >
      <div aria-live="polite" className="dice-pair">
        <DieFace index={0} isRolling={isRolling} value={displayValues[0]} />
        <DieFace index={1} isRolling={isRolling} value={displayValues[1]} />
        {/* Beside the white dice but visibly not one of them: only the white
            dice decide doubles and Jail, and the board has to show that. */}
        {speedDieFace ? <SpeedDie face={speedDieFace} isRolling={isRolling} /> : null}
      </div>
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

interface SpeedDieProps {
  face: SpeedDieFace;
  isRolling: boolean;
}

/** What each face shows. Numbers keep pips; the other two carry a mark. */
const SPEED_DIE_LABELS: Record<SpeedDieFace, string> = {
  [SpeedDieFace.One]: '1',
  [SpeedDieFace.Two]: '2',
  [SpeedDieFace.Three]: '3',
  [SpeedDieFace.Bus]: 'BUS',
  [SpeedDieFace.MrMonopoly]: 'MR. M',
};

function SpeedDie({ face, isRolling }: SpeedDieProps) {
  return (
    <div
      aria-label={`Speed Die: ${SPEED_DIE_LABELS[face]}`}
      className={`die-face is-speed-die ${isRolling ? 'is-rolling' : ''}`}
      data-testid={TEST_IDS.speedDieFace}
    >
      <span className="speed-die-label">{SPEED_DIE_LABELS[face]}</span>
    </div>
  );
}
