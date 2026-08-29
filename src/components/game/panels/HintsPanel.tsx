import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface HintsPanelProps {
  hints: string[];
}

/** Surfaces engine `uiHints` - currently the "not implemented yet" notices. */
export function HintsPanel({ hints }: HintsPanelProps) {
  if (hints.length === 0) {
    return null;
  }

  return (
    <section className="decision-card" data-testid={TEST_IDS.hintsPanel}>
      <h2>Upcoming phases</h2>
      <div className="event-list">
        {hints.map((hint) => (
          <div className="event-item" key={hint}>
            {hint}
          </div>
        ))}
      </div>
    </section>
  );
}
