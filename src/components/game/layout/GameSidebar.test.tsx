import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionTheme } from '../../../domain/themes/indiaEditionTheme';
import { TurnPhase } from '../../../domain/types/game.enums';
import type { GameState } from '../../../domain/types/game.interfaces';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { GameSidebar } from './GameSidebar';
import type { PlayerSummary } from '../panels/panels.interfaces';

const summary = (index: number): PlayerSummary => ({
  player: {
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
    tokenId: indiaEditionTheme.tokenCatalog[index].id,
    cash: 1500,
    position: 0,
    inJail: false,
    jailTurnsServed: 0,
    jailFreeCards: [],
    isBankrupt: false,
    bankruptcyRank: null,
    hasPassedGo: false,
    lastMove: null,
  },
  token: indiaEditionTheme.tokenCatalog[index],
  propertyCount: 0,
  netWorth: 1500,
  mortgagedCount: 0,
  setProgress: [],
});

const turn: GameState['turn'] = {
  phase: TurnPhase.AwaitRoll,
  lastRoll: null,
  lastRollId: null,
  doublesCount: 0,
  canRollAgain: false,
  reason: null,
  speedDieFace: null,
  pendingMonopolyAdvance: false,
};

const renderSidebar = (overrides: Partial<Parameters<typeof GameSidebar>[0]> = {}) =>
  renderWithProviders(
    <GameSidebar
      bannerProps={{ message: null, onDismiss: vi.fn() }}
      canEndTurn
      canRoll
      connectedSeatIds={new Set<string>()}
      currencySymbol="₹"
      eventCount={7}
      onDismissToast={vi.fn()}
      onEndTurn={vi.fn()}
      onOpenActivity={vi.fn()}
      onRoll={vi.fn()}
      onSelectPlayer={vi.fn()}
      soundEnabled
      summaries={[summary(0), summary(1)]}
      toastDismissAfterMs={4000}
      toasts={[]}
      turn={turn}
      {...overrides}
    />
  );

describe('GameSidebar', () => {
  /**
   * The phone frame makes this wrapper a sticky bar, so what it contains is a
   * layout guarantee rather than a detail: a toast has to travel with the dice
   * it is reporting on, and CLAUDE.md records that adjacency as load-bearing.
   * jsdom does no layout, so only the structure is assertable here - the
   * geometry is in tests/e2e/mobile.spec.ts.
   */
  it('groups the toasts and the turn controls into one footer', () => {
    const { container } = renderSidebar();

    const footer = container.querySelector('.game-side-footer');
    expect(footer).not.toBeNull();
    expect(footer?.querySelector('.toast-stack')).not.toBeNull();
    expect(
      footer?.querySelector(`[data-testid="${TEST_IDS.turnControls}"]`)
    ).not.toBeNull();
  });

  it('keeps the toasts above the dice inside that footer', () => {
    const { container } = renderSidebar();

    const children = Array.from(
      container.querySelector('.game-side-footer')?.children ?? []
    );
    const toasts = children.findIndex((node) => node.classList.contains('toast-stack'));
    const controls = children.findIndex(
      (node) => node.getAttribute('data-testid') === TEST_IDS.turnControls
    );

    expect(toasts).toBeGreaterThanOrEqual(0);
    expect(toasts).toBeLessThan(controls);
  });

  /**
   * It is `position: fixed` on a desktop, so its DOM position is invisible
   * there - which is exactly why it can live in the bar. On a phone it goes
   * static and lands in the row instead of floating on top of it.
   */
  it('renders the activity button inside the turn-control row', () => {
    const { container } = renderSidebar();

    const controls = container.querySelector(`[data-testid="${TEST_IDS.turnControls}"]`);
    expect(
      controls?.querySelector(`[data-testid="${TEST_IDS.activityButton}"]`)
    ).not.toBeNull();
  });

  it('reports the history size on the activity button', () => {
    renderSidebar({ eventCount: 7 });

    expect(
      screen.getByRole('button', { name: 'Open activity log, 7 events' })
    ).toBeInTheDocument();
  });
});
