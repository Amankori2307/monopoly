import type { PropertyActionDescriptor } from '../../../domain/rules/playerActions.utils';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';

interface ActionRailProps {
  actions: PropertyActionDescriptor[];
  onAction: (descriptor: PropertyActionDescriptor) => void;
}

/**
 * Property-management rail. Availability is decided by
 * domain/rules/playerActions.utils so this stays presentational.
 */
export function ActionRail({ actions, onAction }: ActionRailProps) {
  return (
    <nav
      aria-label="Property actions"
      className="action-rail"
      data-testid={TEST_IDS.actionRail}
    >
      {actions.map((descriptor) => (
        <button
          className={`rail-button rail-${descriptor.action}`}
          data-testid={scopedTestId(TEST_IDS.propertyActionButton, descriptor.action)}
          disabled={!descriptor.isEnabled}
          key={descriptor.action}
          onClick={() => onAction(descriptor)}
          title={descriptor.disabledReason || descriptor.label}
          type="button"
        >
          {descriptor.label}
        </button>
      ))}
    </nav>
  );
}
