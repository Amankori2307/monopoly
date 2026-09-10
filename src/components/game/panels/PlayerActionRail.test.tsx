import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PropertyAction } from '../../../domain/types/game.enums';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerActionRow } from './panels.interfaces';
import { PlayerActionRail } from './PlayerActionRail';

const row = (overrides: Partial<PlayerActionRow> = {}): PlayerActionRow => ({
  action: PropertyAction.Build,
  label: 'Build',
  accessibleName: 'Build on a city',
  isEnabled: true,
  disabledReason: '',
  sites: [],
  ...overrides,
});

describe('PlayerActionRail', () => {
  it('renders a button for every row it is given', () => {
    render(
      <PlayerActionRail
        onPick={vi.fn()}
        rows={[
          row(),
          row({ action: PropertyAction.Mortgage, label: 'Mortgage' }),
          row({ action: null, label: 'Trade' }),
        ]}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(3);
    // Trade has no PropertyAction, so it keys and identifies itself by name.
    expect(screen.getByTestId(`${TEST_IDS.actionRailButton}-trade`)).toBeInTheDocument();
  });

  /**
   * One word on screen because five buttons share the width of a phone; the
   * object the copy convention wants is in the accessible name, where it costs
   * no pixels.
   */
  it('says one word, and names the object to assistive tech', () => {
    render(<PlayerActionRail onPick={vi.fn()} rows={[row()]} />);

    const button = screen.getByRole('button', { name: 'Build on a city' });
    expect(button).toHaveTextContent('Build');
  });

  it('reports the row that was picked, not just the action', () => {
    const onPick = vi.fn();
    const mortgage = row({ action: PropertyAction.Mortgage, label: 'Mortgage' });
    render(<PlayerActionRail onPick={onPick} rows={[row(), mortgage]} />);

    fireEvent.click(screen.getByTestId(`${TEST_IDS.actionRailButton}-mortgage`));

    // The whole row: the picker lists this row's own eligible sites, and
    // looking them up a second time somewhere else is how the two drift.
    expect(onPick).toHaveBeenCalledWith(mortgage);
  });

  /**
   * Disabled rather than removed: the row must not change shape mid-game, or
   * a player cannot learn where Mortgage is. And it has to say why - a dead
   * control with no explanation is the bug CLAUDE.md records for Buy.
   */
  it('keeps a dead button in place, carrying its reason', () => {
    render(
      <PlayerActionRail
        onPick={vi.fn()}
        rows={[row({ isEnabled: false, disabledReason: 'You do not own anything yet' })]}
      />
    );

    const button = screen.getByRole('button', { name: 'Build on a city' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You do not own anything yet');
  });

  it('carries no title at all when there is nothing to explain', () => {
    render(<PlayerActionRail onPick={vi.fn()} rows={[row()]} />);

    expect(screen.getByRole('button', { name: 'Build on a city' })).not.toHaveAttribute(
      'title'
    );
  });
});
