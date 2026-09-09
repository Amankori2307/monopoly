import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import { NewGamePage } from './NewGamePage';

describe('NewGamePage', () => {
  it('renders setup and recent games areas', () => {
    renderWithProviders(<NewGamePage />);

    expect(screen.getByText(/Start a new game/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent games/i)).toBeInTheDocument();
  });

  it('validates duplicate player names', () => {
    renderWithProviders(<NewGamePage />);

    const nameInputs = screen.getAllByDisplayValue(/Player/i);
    fireEvent.change(nameInputs[0], { target: { value: 'Asha' } });
    fireEvent.change(nameInputs[1], { target: { value: 'Asha' } });
    fireEvent.click(screen.getByRole('button', { name: /Create game/i }));

    expect(screen.getByText(/Player names must be unique/i)).toBeInTheDocument();
  });
});

/**
 * The setup screen carries the form and the saves, and nothing else.
 *
 * It used to open with a masthead: the edition's name in the display serif, a
 * lede, an "at a glance" ruleset card and a link to the booklet. That is all
 * gone - the header carries the nav, and the front door carries the framing.
 */
describe('the setup screen', () => {
  it('leads with the form rather than a banner', () => {
    renderWithProviders(<NewGamePage />);

    expect(screen.getByText(/Start a new game/i)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_IDS.rulesetGlance)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Read the rules/i })
    ).not.toBeInTheDocument();
  });

  it('says nothing about how the app is built', () => {
    const { container } = renderWithProviders(<NewGamePage />);

    const copy = (container.textContent ?? '').toLowerCase();
    expect(copy).not.toContain('localstorage');
    expect(copy).not.toContain('rules engine');
    expect(copy).not.toContain('planned later');
  });

  // A shipped rule must not be described as unbuilt.
  it('offers the Speed Die as a choice', () => {
    renderWithProviders(<NewGamePage />);

    expect(screen.getByTestId(TEST_IDS.speedDieToggle)).toBeInTheDocument();
  });
});
