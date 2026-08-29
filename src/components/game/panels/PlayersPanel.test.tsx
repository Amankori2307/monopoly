import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MAX_PLAYERS } from '../../../domain/constants/game.constants';
import { indiaEditionTheme } from '../../../domain/themes/indiaEditionTheme';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerSummary } from './panels.interfaces';
import { PlayersPanel } from './PlayersPanel';

const makeSummary = (index: number): PlayerSummary => ({
  player: {
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
    tokenId: indiaEditionTheme.tokenCatalog[index].id,
    cash: 1500,
    position: 0,
    inJail: false,
    jailTurnsServed: 0,
    jailFreeCards: 0,
    isBankrupt: false,
    bankruptcyRank: null,
  },
  token: indiaEditionTheme.tokenCatalog[index],
  propertyCount: 0,
});

const renderPanel = (playerCount = 2, onSelectPlayer = vi.fn()) => {
  const view = render(
    <PlayersPanel
      currencySymbol="M"
      onSelectPlayer={onSelectPlayer}
      summaries={Array.from({ length: playerCount }, (_, i) => makeSummary(i))}
    />
  );
  return { ...view, onSelectPlayer };
};

describe('PlayersPanel', () => {
  it('starts collapsed as a stack', () => {
    renderPanel();

    expect(screen.getByTestId(TEST_IDS.playerStack)).toHaveClass('is-collapsed');
    expect(screen.getByTestId(TEST_IDS.playerStackExpand)).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  // The stack is bare: no panel surface and no "Players" heading around it.
  it('renders without a panel wrapper or heading', () => {
    const { container } = renderPanel();

    expect(container.querySelector('.panel')).toBeNull();
    expect(screen.queryByRole('heading', { name: /players/i })).not.toBeInTheDocument();
  });

  // Order is the only signal for whose turn it is, so the first card must be the
  // first summary handed in - selectPlayerSummaries puts the active player there.
  it('renders cards in the order given, active player first', () => {
    renderPanel(3);

    const order = screen
      .getAllByRole('article')
      .map((card) => card.getAttribute('data-testid'));

    expect(order).toEqual([
      `${TEST_IDS.playerCard}-player-1`,
      `${TEST_IDS.playerCard}-player-2`,
      `${TEST_IDS.playerCard}-player-3`,
    ]);
  });

  it('does not mark any card as active', () => {
    const { container } = renderPanel(3);

    expect(container.querySelectorAll('.is-active')).toHaveLength(0);
  });

  it('renders every player card even while collapsed', () => {
    renderPanel(4);

    const stack = screen.getByTestId(TEST_IDS.playerStack);
    expect(within(stack).getAllByRole('article')).toHaveLength(4);
  });

  it('expands into a list when the stack is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.playerStackExpand));

    expect(screen.getByTestId(TEST_IDS.playerStack)).toHaveClass('is-expanded');
    expect(screen.getByTestId(TEST_IDS.playerStackToggle)).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  // The collapse control is meaningless while collapsed, so it only appears once
  // the stack is open.
  it('shows the collapse control only while expanded', () => {
    renderPanel();
    expect(screen.queryByTestId(TEST_IDS.playerStackToggle)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(TEST_IDS.playerStackExpand));

    expect(screen.getByTestId(TEST_IDS.playerStackToggle)).toBeInTheDocument();
  });

  // The click target only exists while collapsed; expanding removes it so the
  // cards underneath become reachable again.
  it('removes the stack click target once expanded', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.playerStackExpand));

    expect(screen.queryByTestId(TEST_IDS.playerStackExpand)).not.toBeInTheDocument();
  });

  it('collapses again from the collapse control', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId(TEST_IDS.playerStackExpand));
    fireEvent.click(screen.getByTestId(TEST_IDS.playerStackToggle));

    expect(screen.getByTestId(TEST_IDS.playerStack)).toHaveClass('is-collapsed');
  });

  it('labels the click target with the player count', () => {
    renderPanel(3);

    expect(
      screen.getByRole('button', { name: 'Show all 3 players' })
    ).toBeInTheDocument();
  });

  // The stack's z-order comes from :nth-of-type rules generated up to
  // $max-players in SCSS; that loop must cover a full table.
  it('supports a full table of players', () => {
    renderPanel(MAX_PLAYERS);

    const stack = screen.getByTestId(TEST_IDS.playerStack);
    expect(within(stack).getAllByRole('article')).toHaveLength(MAX_PLAYERS);
  });
});
