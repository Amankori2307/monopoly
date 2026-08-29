import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface TurnPanelProps {
  locationName: string;
  playerName: string;
  tokenEmoji: string;
  turnNumber: number;
}

/** Whose turn it is and where they stand. Turn controls live in TurnControls. */
export function TurnPanel({
  locationName,
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
    </section>
  );
}
