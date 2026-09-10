import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ColorGroupProgress } from '../../../domain/rules/holdings.utils';
import { indiaTheme as indiaEditionTheme } from '../../../domain/themes/india.theme';
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
    jailFreeCards: [],
    isBankrupt: false,
    bankruptcyRank: null,
    hasPassedGo: false,
    lastMove: null,
  },
  token: indiaEditionTheme.tokenCatalog[0],
  propertyCount: 0,
  netWorth: 500,
  mortgagedCount: 0,
  setProgress: [],
  isActive: false,
  seatIndex: 0,
  ...overrides,
});

const renderCard = (overrides: Partial<PlayerSummary> = {}) => {
  const onOpen = vi.fn();
  const view = render(
    <PlayerCard currencySymbol="M" onOpen={onOpen} summary={summary(overrides)} />
  );
  return { ...view, onOpen };
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
    // Twice on purpose, and never both visible: the description list is the
    // desktop card's, and .player-card-cash is the phone card's single figure.
    // Both are asserted, so neither can quietly go missing.
    expect(screen.getAllByText('M500')).toHaveLength(2);
    expect(screen.getByTestId(`${TEST_IDS.playerCash}-player-1`)).toHaveTextContent(
      'M500'
    );
  });

  /**
   * The phone card is a name and one figure - at ~115px wide there is room for
   * nothing else - and cash is the figure a player checks. Everything else on
   * the card is hidden by the phone tier and lives in the holdings drawer,
   * which the whole card opens.
   */
  it('carries the cash figure on its own line, for the phone card', () => {
    renderCard({ player: { ...summary().player, cash: 720 } });

    expect(screen.getByTestId(`${TEST_IDS.playerCash}-player-1`)).toHaveTextContent(
      'M720'
    );
  });

  it('says whose turn it is on the card rather than by its position', () => {
    const { rerender } = renderCard({ isActive: false });
    expect(screen.getByTestId(`${TEST_IDS.playerCard}-player-1`)).not.toHaveClass(
      'is-active'
    );

    rerender(
      <PlayerCard
        currencySymbol="M"
        onOpen={vi.fn()}
        summary={summary({ isActive: true })}
      />
    );
    expect(screen.getByTestId(`${TEST_IDS.playerCard}-player-1`)).toHaveClass(
      'is-active'
    );
  });

  // Turn order is DOM order and the fan depends on it; the phone grid orders
  // by seat through CSS so a player keeps their cell all game.
  it('publishes the seat, which is not the same as its place in the DOM', () => {
    renderCard({ seatIndex: 3 });

    expect(screen.getByTestId(`${TEST_IDS.playerCard}-player-1`)).toHaveAttribute(
      'data-seat',
      '3'
    );
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

  /**
   * The control that opens the holdings drawer used to be an EMPTY button with
   * no styles anywhere, so it rendered as a tiny default browser pill in the
   * corner of the card - a control that read as a rendering artefact. It needs
   * a visible mark of its own; the geometry is asserted in mobile.spec.ts.
   */
  it('gives the holdings control a visible mark rather than an empty box', () => {
    renderCard();

    const open = screen.getByRole('button', { name: 'View Asha holdings' });
    expect(open).toHaveClass('player-card-open');

    const chevron = open.querySelector('.player-card-chevron');
    expect(chevron).not.toBeNull();
    expect(chevron?.textContent?.trim()).not.toBe('');
    // Decorative: the button already carries the name.
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
  });

  /**
   * Each label belongs to its own figure. They used to be a flat sequence in a
   * two-column grid borrowed from the generic form layout, which collapsed to
   * one column on a phone and turned two figures into four stacked rows.
   */
  it('pairs each secondary label with its own figure', () => {
    renderCard({ propertyCount: 3, player: { ...summary().player, cash: 500 } });

    const pairs = Array.from(document.querySelectorAll('.player-metrics > div')).map(
      (pair) => [
        pair.querySelector('dt')?.textContent,
        pair.querySelector('dd')?.textContent,
      ]
    );

    expect(pairs).toEqual([
      ['Cash', 'M500'],
      ['Owned', '3'],
    ]);
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
    const { onOpen } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: /View Asha holdings/ }));

    expect(onOpen).toHaveBeenCalledWith('player-1');
  });
});
