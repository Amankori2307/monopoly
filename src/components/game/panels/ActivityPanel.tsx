import type { GameEvent } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface ActivityPanelProps {
  events: GameEvent[];
}

export function ActivityPanel({ events }: ActivityPanelProps) {
  return (
    <section className="panel activity-panel" data-testid={TEST_IDS.activityPanel}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Game record</p>
          <h2>Activity</h2>
        </div>
      </div>
      <div className="event-list">
        {events.map((event) => (
          <div className="event-item" key={event.id}>
            <strong>Turn {event.turnNumber}</strong>
            <div>{event.message}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
