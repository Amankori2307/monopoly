import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface ActivityButtonProps {
  eventCount: number;
  onOpen: () => void;
}

/**
 * Floating control that opens the activity drawer, keeping the log off the main
 * screen until it is asked for.
 */
export function ActivityButton({ eventCount, onOpen }: ActivityButtonProps) {
  return (
    <button
      aria-label={`Open activity log, ${eventCount} events`}
      className="activity-button"
      data-testid={TEST_IDS.activityButton}
      onClick={onOpen}
      type="button"
    >
      <span aria-hidden="true">☰</span>
      <span className="activity-button-count">{eventCount}</span>
    </button>
  );
}
