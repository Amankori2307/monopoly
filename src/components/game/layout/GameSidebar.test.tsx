import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaTheme as indiaEditionTheme } from '../../../domain/themes/india.theme';
import { SpeedDieFace, TurnPhase } from '../../../domain/types/game.enums';
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
  isActive: index === 0,
  seatIndex: index,
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
      onDismissToast={vi.fn()}
      onEndTurn={vi.fn()}
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
   * The log is chrome, not a game control, so it is the header's now - and the
   * bar it used to share with the dice is the tightest row on a phone. Its own
   * coverage moved to AppHeader.test.tsx and navigation.spec.ts.
   */
  it('leaves the activity log to the header', () => {
    const { container } = renderSidebar();

    expect(
      container.querySelector(`[data-testid="${TEST_IDS.activityButton}"]`)
    ).toBeNull();
  });
});

/**
 * The dice are drawn twice and rolled once.
 *
 * The phone puts the faces between the two columns of player cards, as the
 * reference boards do, while the Roll button stays in the bar where it has
 * room for a 44px control and a real label. Both mounts are always rendered
 * and the stylesheet shows one - there is no viewport check in JavaScript.
 *
 * The number of ROLLERS is the part that matters: `useDiceRoller` plays the
 * roll sound itself, so a second call would sound every throw twice, and
 * CLAUDE.md is explicit that a half-muted game is worse than none.
 */
describe('the dice, drawn twice', () => {
  it('mounts the faces in the dock and in the HUD', () => {
    renderSidebar();

    expect(screen.getByTestId(`${TEST_IDS.dieFace}-0`)).toBeInTheDocument();
    expect(screen.getByTestId(`${TEST_IDS.dieFaceHud}-0`)).toBeInTheDocument();
  });

  it('gives the two mounts separate ids, so a query can name one', () => {
    renderSidebar();

    // Playwright's strict mode fails on two matches even when one of them is
    // display:none, which is exactly the situation here.
    expect(screen.getAllByTestId(new RegExp(`^${TEST_IDS.dieFace}-\\d$`))).toHaveLength(
      2
    );
    expect(
      screen.getAllByTestId(new RegExp(`^${TEST_IDS.dieFaceHud}-\\d$`))
    ).toHaveLength(2);
  });

  it('keeps the roll button in the turn row, not in the middle column', () => {
    const { container } = renderSidebar();

    const row = container.querySelector(`[data-testid="${TEST_IDS.turnControls}"]`);
    expect(row?.querySelector(`[data-testid="${TEST_IDS.rollButton}"]`)).not.toBeNull();

    const centre = screen.getByTestId(TEST_IDS.playerStackCentre);
    expect(centre.querySelector(`[data-testid="${TEST_IDS.rollButton}"]`)).toBeNull();
    expect(
      centre.querySelector(`[data-testid="${TEST_IDS.dieFaceHud}-0"]`)
    ).not.toBeNull();
  });

  it('shows both Speed Dice, or neither, from the one turn state', () => {
    const { unmount } = renderSidebar({
      turn: { ...turn, speedDieFace: SpeedDieFace.Bus },
    });
    expect(screen.getByTestId(TEST_IDS.speedDieFace)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.speedDieFaceHud)).toBeInTheDocument();

    unmount();
    renderSidebar();
    expect(screen.queryByTestId(TEST_IDS.speedDieFace)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TEST_IDS.speedDieFaceHud)).not.toBeInTheDocument();
  });
});
