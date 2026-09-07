import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { DecisionPanel } from '../panels/decisions/DecisionPanel';
import type {
  BidFieldState,
  DecisionHandlers,
  DecisionViewModel,
} from '../panels/panels.interfaces';

interface DecisionSpectatorLayerProps {
  bidField: BidFieldState | null;
  soundEnabled: boolean;
  currencySymbol: string;
  decision: DecisionViewModel | null;
  handlers: DecisionHandlers;
  /** Whose decision this is, so the panel can say who everyone is waiting on. */
  ownerName: string | null;
}

/**
 * The same decision, for everyone who is not answering it.
 *
 * Three differences from `DecisionModal`, and each is deliberate:
 *
 * - **No backdrop.** The turn is not blocked for this player - they can still
 *   open a deed, read the log, look at holdings. Sheeting the screen would make
 *   somebody else's turn feel like a freeze.
 * - **`pointer-events: none`.** Nothing here is clickable, including the parts
 *   of a panel that are links rather than buttons.
 * - **A real `<fieldset disabled>`.** Every nested control is inert by the
 *   platform rather than by a prop each decision panel has to remember to
 *   thread. A new decision type cannot forget to be read-only.
 *
 * The panel itself is unchanged - the same component the owner sees, so the two
 * cannot drift into showing different games.
 */
export function DecisionSpectatorLayer({
  bidField,
  soundEnabled,
  currencySymbol,
  decision,
  handlers,
  ownerName,
}: DecisionSpectatorLayerProps) {
  if (!decision) {
    return null;
  }

  return (
    <aside
      aria-live="polite"
      className="decision-spectator"
      data-testid={TEST_IDS.decisionSpectator}
    >
      <p className="decision-spectator-waiting">
        {ownerName ? `Waiting for ${ownerName}` : 'Waiting for the table'}
      </p>
      <fieldset disabled>
        <DecisionPanel
          bidField={bidField}
          soundEnabled={soundEnabled}
          currencySymbol={currencySymbol}
          decision={decision}
          handlers={handlers}
        />
      </fieldset>
    </aside>
  );
}
