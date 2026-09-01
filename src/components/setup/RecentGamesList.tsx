import { useState } from 'react';
import type { StoredGameIndexEntry } from '../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../shared/constants/testIds.constants';

interface RecentGamesListProps {
  games: StoredGameIndexEntry[];
  onContinue: (gameId: string) => void;
  onDelete: (gameId: string) => void;
}

/**
 * Saved games, with a two-step delete.
 *
 * Deleting a save is the one irreversible thing this screen does, and the
 * button sat one click away from Continue - so it asks first, in place, rather
 * than through a dialog that would need dismissing.
 */
export function RecentGamesList({ games, onContinue, onDelete }: RecentGamesListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (games.length === 0) {
    return (
      <div className="empty-state">No saved games yet. Create one to get started.</div>
    );
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
            {confirmingId === game.id ? (
              <>
                <button
                  className="danger-button"
                  data-testid={scopedTestId(TEST_IDS.confirmDeleteGame, game.id)}
                  onClick={() => {
                    onDelete(game.id);
                    setConfirmingId(null);
                  }}
                  type="button"
                >
                  Delete for good
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setConfirmingId(null)}
                  type="button"
                >
                  Keep
                </button>
              </>
            ) : (
              <button
                className="danger-button"
                data-testid={scopedTestId(TEST_IDS.deleteGame, game.id)}
                onClick={() => setConfirmingId(game.id)}
                type="button"
              >
                Delete
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
