import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { DecisionPanel } from '../panels/decisions/DecisionPanel';
import type {
  BidFieldState,
  DecisionHandlers,
  DecisionViewModel,
} from '../panels/panels.interfaces';

interface DecisionModalProps {
  bidField: BidFieldState | null;
  currencySymbol: string;
  decision: DecisionViewModel | null;
  handlers: DecisionHandlers;
}

/**
 * Pending decisions take over the screen instead of sitting in the sidebar.
 *
 * Deliberately not dismissible - no backdrop click, no Escape, no close button.
 * The turn cannot advance until the decision is answered, so an escape hatch
 * would only strand the player with no way back to it.
 */
export function DecisionModal({
  bidField,
  currencySymbol,
  decision,
  handlers,
}: DecisionModalProps) {
  if (!decision) {
    return null;
  }

  return (
    <div className="decision-backdrop">
      <div
        aria-modal="true"
        className="decision-modal"
        data-testid={TEST_IDS.decisionModal}
        role="dialog"
      >
        <DecisionPanel
          bidField={bidField}
          currencySymbol={currencySymbol}
          decision={decision}
          handlers={handlers}
        />
      </div>
    </div>
  );
}
