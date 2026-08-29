import type { PlayerId } from '../../../domain/types/game.interfaces';
import type { PlayerSummary } from './panels.interfaces';
import { formatMoney } from '../../../shared/utils/money.utils';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';

interface PlayersPanelProps {
  activePlayerId: PlayerId;
  currencySymbol: string;
  summaries: PlayerSummary[];
}

export function PlayersPanel({
  activePlayerId,
  currencySymbol,
  summaries,
}: PlayersPanelProps) {
  return (
    <section className="panel player-panel" data-testid={TEST_IDS.playersPanel}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Table</p>
          <h2>Players</h2>
        </div>
        <span className="counter-badge">{summaries.length}</span>
      </div>
      <div className="player-list">
        {summaries.map(({ player, token, propertyCount }) => (
          <article
            className={`player-card ${player.id === activePlayerId ? 'is-active' : ''}`}
            data-testid={scopedTestId(TEST_IDS.playerCard, player.id)}
            key={player.id}
          >
            <strong>
              {token?.emoji} {player.name}
            </strong>
            <div className="player-metrics">
              <span>Cash</span>
              <strong>{formatMoney(player.cash, currencySymbol)}</strong>
              <span>Properties</span>
              <strong>{propertyCount}</strong>
              <span>Position</span>
              <strong>{player.position}</strong>
              <span>Jail</span>
              <strong>{player.inJail ? `Yes (${player.jailTurnsServed})` : 'No'}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
