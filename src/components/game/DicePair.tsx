import { SpeedDieFace } from '../../domain/types/game.enums';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { DieFace } from './DieFace';

interface DicePairProps {
  displayValues: [number, number];
  isRolling: boolean;
  /**
   * Which of the two mounts this is - the dice dock, or the phone HUD's middle
   * column. It picks the class the stylesheet shows or hides, and the test ids:
   * two elements answering `die-face-0` is a strict-mode failure in Playwright
   * even when one of them is `display: none`.
   */
  scope: 'dock' | 'hud';
  /** The Speed Die's face, when this game is playing with one. */
  speedDieFace: SpeedDieFace | null;
}

/**
 * The faces, and nothing else.
 *
 * Split from `DiceDock` so the phone can put the dice between the two columns
 * of player cards, as the reference boards do, while the Roll button stays in
 * the bar where it has room for a 44px control and a real label.
 *
 * Presentational on purpose: `useDiceRoller` is called ONCE, by `GameSidebar`,
 * and its result is handed to both mounts. The hook plays the roll sound
 * itself, so two of them would mean two sounds - and CLAUDE.md is explicit
 * that a half-muted game is worse than none.
 */
export function DicePair({
  displayValues,
  isRolling,
  scope,
  speedDieFace,
}: DicePairProps) {
  const isHud = scope === 'hud';

  return (
    <div aria-live="polite" className={`dice-pair is-${scope}`}>
      <DieFace index={0} isHud={isHud} isRolling={isRolling} value={displayValues[0]} />
      <DieFace index={1} isHud={isHud} isRolling={isRolling} value={displayValues[1]} />
      {/* Beside the white dice but visibly not one of them: only the white
          dice decide doubles and Jail, and the board has to show that. */}
      {speedDieFace ? (
        <SpeedDie face={speedDieFace} isHud={isHud} isRolling={isRolling} />
      ) : null}
    </div>
  );
}

interface SpeedDieProps {
  face: SpeedDieFace;
  isHud: boolean;
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

function SpeedDie({ face, isHud, isRolling }: SpeedDieProps) {
  return (
    <div
      aria-label={`Speed Die: ${SPEED_DIE_LABELS[face]}`}
      className={`die-face is-speed-die ${isRolling ? 'is-rolling' : ''}`}
      data-testid={isHud ? TEST_IDS.speedDieFaceHud : TEST_IDS.speedDieFace}
    >
      <span className="speed-die-label">{SPEED_DIE_LABELS[face]}</span>
    </div>
  );
}
