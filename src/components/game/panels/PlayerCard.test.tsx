import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ColorGroupProgress } from '../../../domain/rules/holdings.utils';
import { indiaEditionTheme } from '../../../domain/themes/indiaEditionTheme';
import { ColorGroup } from '../../../domain/types/game.enums';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerSummary } from './panels.interfaces';
import { PlayerCard } from './PlayerCard';

const summary = (overrides: Partial<PlayerSummary> = {}): PlayerSummary => ({
  player: {
    id: 'player-1',
    name: 'Asha',
    tokenId: 'elephant',
    cash: 500,
    position: 0,
    inJail: false,
    jailTurnsServed: 0,
    jailFreeCards: 0,
    isBankrupt: false,
    bankruptcyRank: null,
  },
  token: indiaEditionTheme.tokenCatalog[0],
  propertyCount: 0,
  netWorth: 500,
  mortgagedCount: 0,
  setProgress: [],
  ...overrides,
});

const renderCard = (overrides: Partial<PlayerSummary> = {}) => {
  const onOpen = vi.fn();
  render(
    <PlayerCard
      currencySymbol="M"
      isInteractive
      onOpen={onOpen}
      summary={summary(overrides)}
    />
  );
  return onOpen;
};

const progress = (
  group: ColorGroup,
  owned: number,
  total: number
): ColorGroupProgress => ({ group, owned, total, isComplete: owned === total });

describe('PlayerCard', () => {
  it('shows the player name', () => {
    renderCard();

    expect(screen.getByText(/Asha/)).toBeInTheDocument();
  });

  // Cash alone misleads when a player is property-rich, so net worth leads.
  it('leads with net worth and shows cash separately', () => {
    renderCard({ netWorth: 2400, player: { ...summary().player, cash: 500 } });

    expect(screen.getByTestId(`${TEST_IDS.playerNetWorth}-player-1`)).toHaveTextContent(
      'M2400'
    );
    expect(screen.getByText('M500')).toBeInTheDocument();
  });

  it('shows the site count', () => {
    renderCard({ propertyCount: 6 });

    expect(screen.getByTestId(`${TEST_IDS.playerSiteCount}-player-1`)).toHaveTextContent(
      '6'
    );
  });

  // Only worth saying when it is true.
  it('mentions mortgaged sites only when there are some', () => {
    renderCard({ propertyCount: 6, mortgagedCount: 0 });
    expect(screen.queryByText(/mortgaged/)).not.toBeInTheDocument();
  });

  // The count is a badge rather than text appended to the site figure - one
  // card should not say the same thing twice.
  it('shows mortgaged sites as a badge, not appended to the site count', () => {
    renderCard({ mortgagedCount: 2, propertyCount: 5 });

    expect(screen.getByTestId(`${TEST_IDS.playerBadge}-mortgaged`)).toHaveTextContent(
      '2 mortgaged'
    );
    expect(screen.getByTestId(`${TEST_IDS.playerSiteCount}-player-1`)).toHaveTextContent(
      '5'
    );
  });

  it('renders no pips when the player holds nothing', () => {
    renderCard();

    expect(screen.queryByTestId(TEST_IDS.colorGroupPips)).not.toBeInTheDocument();
  });

  it('renders one pip per colour group held', () => {
    renderCard({
      setProgress: [progress(ColorGroup.Brown, 1, 2), progress(ColorGroup.Red, 2, 3)],
    });

    expect(screen.getByTestId(`${TEST_IDS.colorGroupPip}-brown`)).toBeInTheDocument();
    expect(screen.getByTestId(`${TEST_IDS.colorGroupPip}-red`)).toBeInTheDocument();
  });

  it('marks a completed set', () => {
    renderCard({ setProgress: [progress(ColorGroup.Brown, 2, 2)] });

    const pip = screen.getByTestId(`${TEST_IDS.colorGroupPip}-brown`);
    expect(pip).toHaveClass('is-complete');
    expect(pip).toHaveAttribute('aria-label', expect.stringContaining('complete set'));
  });

  it('does not mark a partial set as complete', () => {
    renderCard({ setProgress: [progress(ColorGroup.Brown, 1, 2)] });

    expect(screen.getByTestId(`${TEST_IDS.colorGroupPip}-brown`)).not.toHaveClass(
      'is-complete'
    );
  });

  it('opens the player’s holdings when clicked', () => {
    const onOpen = renderCard();

    fireEvent.click(screen.getByRole('button', { name: /View Asha holdings/ }));

    expect(onOpen).toHaveBeenCalledWith('player-1');
  });
});
