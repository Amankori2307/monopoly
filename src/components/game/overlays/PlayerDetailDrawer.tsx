import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { formatMoney } from '../../../shared/utils/money.utils';
import type { HoldingEntry, PlayerSummary } from '../panels/panels.interfaces';
import { SideDrawer } from './SideDrawer';

interface PlayerDetailDrawerProps {
  currencySymbol: string;
  holdings: HoldingEntry[];
  onClose: () => void;
  summary: PlayerSummary | null;
}

/** Opened by clicking a player card; holdings are not shown on the main screen. */
export function PlayerDetailDrawer({
  currencySymbol,
  holdings,
  onClose,
  summary,
}: PlayerDetailDrawerProps) {
  if (!summary) {
    return null;
  }

  const { player, token } = summary;

  return (
    <SideDrawer
      eyebrow="Player"
      isOpen
      onClose={onClose}
      testId={TEST_IDS.playerDetailDrawer}
      title={`${token?.emoji ?? ''} ${player.name}`.trim()}
    >
      <div className="drawer-stats">
        <span>
          Cash<strong>{formatMoney(player.cash, currencySymbol)}</strong>
        </span>
        <span>
          Position<strong>{player.position}</strong>
        </span>
        <span>
          Properties<strong>{summary.propertyCount}</strong>
        </span>
        <span>
          Jail<strong>{player.inJail ? `Yes (${player.jailTurnsServed})` : 'No'}</strong>
        </span>
      </div>

      <p className="deed-rent-title">Holdings</p>
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
    </SideDrawer>
  );
}
