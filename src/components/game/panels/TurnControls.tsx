import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { DiceDock } from '../DiceDock';

interface TurnControlsProps {
  canEndTurn: boolean;
  canRoll: boolean;
  canRollAgain: boolean;
  lastRoll: number[] | null;
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
  onEndTurn,
  onRoll,
  rollLabel,
}: TurnControlsProps) {
  return (
    <div className="turn-controls" data-testid={TEST_IDS.turnControls}>
      {canEndTurn ? (
        <button
          className="primary-button end-turn-button"
          data-testid={TEST_IDS.endTurnButton}
          onClick={onEndTurn}
          type="button"
        >
          {canRollAgain ? 'Take extra roll' : 'Done'}
        </button>
      ) : null}
      <DiceDock
        canRoll={canRoll}
        lastRoll={lastRoll}
        onRoll={onRoll}
        rollLabel={rollLabel}
      />
    </div>
  );
}
