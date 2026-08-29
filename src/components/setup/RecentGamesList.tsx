import type { StoredGameIndexEntry } from '../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../shared/constants/testIds.constants';

interface RecentGamesListProps {
  games: StoredGameIndexEntry[];
  onContinue: (gameId: string) => void;
  onDelete: (gameId: string) => void;
}

export function RecentGamesList({ games, onContinue, onDelete }: RecentGamesListProps) {
  if (games.length === 0) {
    return <div className="empty-state">No saved games yet. Create one to get started.</div>;
  }

  return (
    <div className="recent-games" data-testid={TEST_IDS.recentGamesList}>
      {games.map((game) => (
        <article
          className="recent-game-item"
          data-testid={scopedTestId(TEST_IDS.recentGameItem, game.id)}
          key={game.id}
        >
          <strong>{game.name}</strong>
          <div className="recent-game-meta">
            <span>{game.playerCount} players</span>
            <span>Turn {game.turnNumber}</span>
            <span>Updated {new Date(game.updatedAt).toLocaleString()}</span>
          </div>
          <div className="button-row">
            <button
              className="primary-button"
              onClick={() => onContinue(game.id)}
              type="button"
            >
              Continue
            </button>
            <button
              className="danger-button"
              onClick={() => onDelete(game.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
