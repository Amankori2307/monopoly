import type { BoardSpace } from '../../../../domain/types/game.interfaces';
import { TEST_IDS, scopedTestId } from '../../../../shared/constants/testIds.constants';

interface SpeedDieDestinationDecisionProps {
  /** Every space on the board, in board order. */
  board: BoardSpace[];
  onChoose: (spaceId: string) => void;
  playerName: string;
}

/**
 * All three dice matched: move to any space on the board.
 *
 * A list of every space rather than a click on the board itself - the decision
 * modal is deliberately non-dismissible and covers it, the same reason the
 * liquidation panel carries its own site list.
 */
export function SpeedDieDestinationDecision({
  board,
  onChoose,
  playerName,
}: SpeedDieDestinationDecisionProps) {
  return (
    <div className="speed-die-decision" data-testid={TEST_IDS.destinationDecision}>
      <p className="eyebrow">Speed Die — three of a kind</p>
      <h2>{playerName} may go anywhere</h2>
      <p className="speed-die-lede">
        All three dice matched. Pick any space; the token travels forward to it, so it
        collects the GO salary on the way if it passes GO.
      </p>

      <ul className="destination-list">
        {board.map((space) => (
          <li key={space.id}>
            <button
              className="secondary-button"
              data-testid={scopedTestId(TEST_IDS.destinationChoice, space.id)}
              onClick={() => onChoose(space.id)}
              type="button"
            >
              {space.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
