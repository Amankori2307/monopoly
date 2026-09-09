import { useState } from 'react';
import type { StoredGameIndexEntry } from '../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../shared/constants/testIds.constants';

interface RecentGamesListProps {
  games: StoredGameIndexEntry[];
  /** Per game, why it cannot be reopened - or absent when it can. */
  blockedReasons?: Record<string, string | null>;
  /** A word for each game's table mode, so a save says which kind it is. */
  modeLabels: Record<string, string>;
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
export function RecentGamesList({
  blockedReasons = {},
  games,
  modeLabels,
  onContinue,
  onDelete,
}: RecentGamesListProps) {
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
          <div className="recent-game-head">
            <strong>{game.name}</strong>
            {/* Which kind of game this is, in words rather than by colour
                alone - an online save behaves differently from a local one. */}
            <span className="recent-game-mode">{modeLabels[game.id]}</span>
          </div>
          <div className="recent-game-meta">
            <span>{game.playerCount} players</span>
            <span>Turn {game.turnNumber}</span>
            <span>Updated {new Date(game.updatedAt).toLocaleString()}</span>
          </div>
          <div className="button-row">
            <button
              className="primary-button"
              disabled={Boolean(blockedReasons[game.id])}
              onClick={() => onContinue(game.id)}
              type="button"
            >
              {/* An online table is rejoined, not continued: the game is
                  somebody else's too, and it has moved on without you. */}
              {modeLabels[game.id] === 'Online' ? 'Rejoin' : 'Continue'}
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

          {/* Shown, not just disabled: a dead button with no reason reads as a
              bug rather than as a table this device cannot reach. */}
          {blockedReasons[game.id] ? (
            <p className="helper-text">{blockedReasons[game.id]}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
