import type { HoldingEntry } from './panels.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface HoldingsPanelProps {
  holdings: HoldingEntry[];
  ownerName: string;
}

export function HoldingsPanel({ holdings, ownerName }: HoldingsPanelProps) {
  return (
    <section className="panel holdings-panel" data-testid={TEST_IDS.holdingsPanel}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h2>{ownerName}&apos;s holdings</h2>
        </div>
        <span className="counter-badge">{holdings.length}</span>
      </div>
      {holdings.length === 0 ? (
        <div className="empty-state">No owned assets yet.</div>
      ) : (
        <div className="space-list">
          {holdings.map(({ space, ownership }) => (
            <article className="space-card" key={space.id}>
              <strong>{space.name}</strong>
              <div>Build level: {ownership?.buildLevel ?? 0}</div>
              <div>Mortgaged: {ownership?.mortgaged ? 'Yes' : 'No'}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
