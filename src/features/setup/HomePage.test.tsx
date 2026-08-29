import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders setup and recent games areas', () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByText(/Start a new game/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent games/i)).toBeInTheDocument();
  });

  it('validates duplicate player names', () => {
    renderWithProviders(<HomePage />);

    const nameInputs = screen.getAllByDisplayValue(/Player/i);
    fireEvent.change(nameInputs[0], { target: { value: 'Asha' } });
    fireEvent.change(nameInputs[1], { target: { value: 'Asha' } });
    fireEvent.click(screen.getByRole('button', { name: /Create game/i }));

    expect(screen.getByText(/Player names must be unique/i)).toBeInTheDocument();
  });
});
