import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../domain/board/indiaEditionBoard';
import type { BoardSpace, StreetSpace } from '../../domain/types/game';
import { SpaceDetailCard } from './SpaceDetailCard';

const findSpace = (kind: BoardSpace['kind']): BoardSpace => {
  const space = indiaEditionBoard.find((candidate) => candidate.kind === kind);
  if (!space) {
    throw new Error(`No ${kind} space on the board`);
  }
  return space;
};

const renderCard = (space: BoardSpace | null, onClose = vi.fn()) => {
  render(<SpaceDetailCard currencySymbol="M" onClose={onClose} space={space} />);
  return onClose;
};

describe('SpaceDetailCard', () => {
  it('renders nothing when no space is selected', () => {
    renderCard(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the full rent schedule for a street', () => {
    const street = findSpace('street') as StreetSpace;
    renderCard(street);

    expect(screen.getByRole('dialog', { name: street.name })).toBeInTheDocument();
    expect(screen.getByText('Title deed')).toBeInTheDocument();
    expect(screen.getByText('With whole colour set')).toBeInTheDocument();
    expect(screen.getByText('With hotel')).toBeInTheDocument();
  });

  // The colour band must carry the theme-driven group class rather than an inline
  // hex, otherwise the deed stops following the active theme.
  it('applies the themed colour-group class to a street colour band', () => {
    const street = findSpace('street') as StreetSpace;
    const { container } = render(
      <SpaceDetailCard currencySymbol="M" onClose={vi.fn()} space={street} />
    );

    const band = container.querySelector('.deed-band');
    expect(band).toHaveClass(`group-${street.colorGroup}`);
    expect(band?.getAttribute('style')).toBeNull();
  });

  it('describes rent as dice-based for a utility', () => {
    renderCard(findSpace('utility'));

    expect(screen.getByText('Rent is based on the dice roll.')).toBeInTheDocument();
    expect(screen.getByText('Both utilities owned')).toBeInTheDocument();
  });

  it('closes on the close button', () => {
    const onClose = renderCard(findSpace('railway'));

    fireEvent.click(screen.getByRole('button', { name: 'Close space details' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape is pressed', () => {
    const onClose = renderCard(findSpace('street'));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when a click starts inside the card', () => {
    const onClose = renderCard(findSpace('street'));

    fireEvent.mouseDown(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
