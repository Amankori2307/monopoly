import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface TurnPanelProps {
  canEndTurn: boolean;
  canRollAgain: boolean;
  locationName: string;
  onEndTurn: () => void;
  playerName: string;
  tokenEmoji: string;
  turnNumber: number;
}

export function TurnPanel({
  canEndTurn,
  canRollAgain,
  locationName,
  onEndTurn,
  playerName,
  tokenEmoji,
  turnNumber,
}: TurnPanelProps) {
  return (
    <section className="turn-panel panel" data-testid={TEST_IDS.turnPanel}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Turn {turnNumber}</p>
          <h2>{playerName}&apos;s move</h2>
        </div>
        <span className="turn-token">{tokenEmoji}</span>
      </div>
      <p className="turn-location">At {locationName}</p>
      {canEndTurn ? (
        <div className="button-row">
          <button
            className="primary-button"
            data-testid={TEST_IDS.endTurnButton}
            onClick={onEndTurn}
            type="button"
          >
            {canRollAgain ? 'Take extra roll' : 'End turn'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
