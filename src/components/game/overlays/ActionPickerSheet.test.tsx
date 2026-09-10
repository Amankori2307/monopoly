import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameCommandType, PropertyAction } from '../../../domain/types/game.enums';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import type { PlayerActionRow } from '../panels/panels.interfaces';
import { ActionPickerSheet } from './ActionPickerSheet';

const siteRow: PlayerActionRow = {
  action: PropertyAction.Mortgage,
  label: 'Mortgage',
  accessibleName: 'Mortgage a city',
  isEnabled: true,
  disabledReason: '',
  sites: [
    {
      spaceId: 'space-1',
      name: 'Guwahati',
      command: GameCommandType.MortgageAsset,
      amount: 30,
    },
    {
      spaceId: 'space-3',
      name: 'Bhubaneshwar',
      command: GameCommandType.MortgageAsset,
      amount: 30,
    },
  ],
};

const tradeRow: PlayerActionRow = {
  action: null,
  label: 'Trade',
  accessibleName: 'Offer a deal',
  isEnabled: true,
  disabledReason: '',
  sites: [],
  opponents: [
    { playerId: 'player-2', name: 'Vikram', tokenId: 'train' },
    { playerId: 'player-3', name: 'Meera', tokenId: 'boat' },
  ],
};

const renderSheet = (row: PlayerActionRow | null, overrides = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onPickSite: vi.fn(),
    onPickOpponent: vi.fn(),
    ...overrides,
  };
  const view = render(<ActionPickerSheet currencySymbol="₹" row={row} {...handlers} />);
  return { ...view, ...handlers };
};

describe('ActionPickerSheet', () => {
  it('renders nothing until a rail button has been pressed', () => {
    renderSheet(null);

    expect(screen.queryByTestId(TEST_IDS.actionPicker)).not.toBeInTheDocument();
  });

  /**
   * The amount is half the reason the list exists: "which of my sites" is not
   * a question anyone can answer without knowing what each one pays.
   */
  it('lists each site with what it is worth', () => {
    renderSheet(siteRow);

    expect(screen.getByText('Guwahati')).toBeInTheDocument();
    expect(screen.getByText('Bhubaneshwar')).toBeInTheDocument();
    expect(screen.getAllByText('₹30')).toHaveLength(2);
  });

  it('reports the command and the site, so the caller needs no lookup', () => {
    const { onPickSite } = renderSheet(siteRow);

    fireEvent.click(screen.getByTestId(`${TEST_IDS.actionPickerChoice}-space-3`));

    expect(onPickSite).toHaveBeenCalledWith(GameCommandType.MortgageAsset, 'space-3');
  });

  // Trade needs somebody to trade WITH, not one of your own squares.
  it('lists opponents rather than sites for a trade', () => {
    const { onPickOpponent } = renderSheet(tradeRow);

    expect(screen.getByText('Vikram')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`${TEST_IDS.actionPickerChoice}-player-3`));

    expect(onPickOpponent).toHaveBeenCalledWith('player-3');
  });

  it('says which question it is asking', () => {
    const { unmount } = renderSheet(siteRow);
    expect(screen.getByText('Which one?')).toBeInTheDocument();
    expect(screen.getByText('Mortgage')).toBeInTheDocument();

    unmount();
    renderSheet(tradeRow);
    expect(screen.getByText('Who with?')).toBeInTheDocument();
  });

  it('rises from the bottom, which is a class on the shared drawer', () => {
    const { container } = render(
      <ActionPickerSheet
        currencySymbol="₹"
        onClose={vi.fn()}
        onPickOpponent={vi.fn()}
        onPickSite={vi.fn()}
        row={siteRow}
      />
    );

    expect(container.querySelector('.side-drawer')).toHaveClass('is-sheet');
  });
});
