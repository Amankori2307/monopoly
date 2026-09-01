import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameStatus } from '../../domain/types/game.enums';
import type { StoredGameIndexEntry } from '../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../shared/constants/testIds.constants';
import { RecentGamesList } from './RecentGamesList';

const game: StoredGameIndexEntry = {
  id: 'game-1',
  name: 'Asha vs Vikram',
  themeId: 'india-edition',
  playerCount: 2,
  playerNames: ['Asha', 'Vikram'],
  status: GameStatus.InProgress,
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:10:00.000Z',
  turnNumber: 4,
  activePlayerId: 'player-1',
  winnerPlayerId: null,
};

const renderList = (onDelete = vi.fn()) => {
  render(<RecentGamesList games={[game]} onContinue={vi.fn()} onDelete={onDelete} />);
  return onDelete;
};

/**
 * Deleting a save is the only irreversible thing this screen does, and its
 * button sat one click from Continue.
 */
describe('deleting a saved game', () => {
  it('does not delete on the first click', () => {
    const onDelete = renderList();

    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.deleteGame, game.id)));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes once the second click confirms it', () => {
    const onDelete = renderList();

    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.deleteGame, game.id)));
    fireEvent.click(
      screen.getByTestId(scopedTestId(TEST_IDS.confirmDeleteGame, game.id))
    );

    expect(onDelete).toHaveBeenCalledWith(game.id);
  });

  it('backs out when Keep is chosen', () => {
    const onDelete = renderList();

    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.deleteGame, game.id)));
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.deleteGame, game.id))
    ).toBeInTheDocument();
  });

  it('says nothing about deleting when there is nothing saved', () => {
    render(<RecentGamesList games={[]} onContinue={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(/no saved games yet/i)).toBeInTheDocument();
  });
});
