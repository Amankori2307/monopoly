import type { GameEvent } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { SideDrawer } from './SideDrawer';

interface ActivityDrawerProps {
  events: GameEvent[];
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityDrawer({ events, isOpen, onClose }: ActivityDrawerProps) {
  return (
    <SideDrawer
      eyebrow="Game record"
      isOpen={isOpen}
      onClose={onClose}
      testId={TEST_IDS.activityDrawer}
      title="Activity"
    >
      {events.length === 0 ? (
        <div className="empty-state">Nothing has happened yet.</div>
      ) : (
        <div className="event-list">
          {events.map((event) => (
            <div className="event-item" key={event.id}>
              <strong>Turn {event.turnNumber}</strong>
              <div>{event.message}</div>
            </div>
          ))}
        </div>
      )}
    </SideDrawer>
  );
}
