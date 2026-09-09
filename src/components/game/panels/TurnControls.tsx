import type { ReactNode } from 'react';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { SpeedDieFace } from '../../../domain/types/game.enums';
import { DiceDock } from '../DiceDock';

interface TurnControlsProps {
  /**
   * Rendered first in the row. The activity button goes here so that on a phone
   * it sits IN the bar rather than floating over it - floating, it landed
   * exactly on top of this row. A slot rather than a hardcoded child, because
   * on desktop the same button is `position: fixed` and this row is only where
   * it happens to live in the DOM.
   */
  leading?: ReactNode;
  /** False when the player has muted the game. */
  soundEnabled: boolean;
  canEndTurn: boolean;
  canRoll: boolean;
  canRollAgain: boolean;
  /** The Speed Die's face this turn, or null in a game without one. */
  speedDieFace: SpeedDieFace | null;
  lastRoll: number[] | null;
  /** Identifies the throw, so every device replays it exactly once. */
  lastRollId: string | null;
  onEndTurn: () => void;
  onRoll: () => void;
  rollLabel: string;
}

/**
 * Bottom-right control cluster: end turn plus the dice, sitting level with the
 * bottom of the board.
 */
export function TurnControls({
  canEndTurn,
  canRoll,
  canRollAgain,
  lastRoll,
  lastRollId,
  leading,
  onEndTurn,
  onRoll,
  rollLabel,
  soundEnabled,
  speedDieFace,
}: TurnControlsProps) {
  return (
    <div className="turn-controls" data-testid={TEST_IDS.turnControls}>
      {leading}
      {canEndTurn ? (
        <button
          className="primary-button end-turn-button"
          data-testid={TEST_IDS.endTurnButton}
          onClick={onEndTurn}
          type="button"
        >
          {/* 'Done' - done with what? Every other action here is verb plus
              object, including the other half of this same ternary, and this
              is the highest-consequence routine click on the screen. */}
          {canRollAgain ? 'Take extra roll' : 'End turn'}
        </button>
      ) : null}
      <DiceDock
        soundEnabled={soundEnabled}
        canRoll={canRoll}
        speedDieFace={speedDieFace}
        lastRoll={lastRoll}
        lastRollId={lastRollId}
        onRoll={onRoll}
        rollLabel={rollLabel}
      />
    </div>
  );
}
