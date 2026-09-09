import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  JAIL_FINE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../../domain/constants/game.constants';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { formatMoney } from '../../shared/utils/money.utils';
import { renderWithProviders } from '../../test/renderWithProviders';
import { NewGamePage } from './NewGamePage';

const CURRENCY = indiaEditionTheme.currencySymbol;

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
 * The masthead lives with the form, not on the front door: it follows whichever
 * ruleset is selected below it, which is its whole purpose.
 *
 * It speaks to a player, not to whoever built the app.
 *
 * It carried a project description ("a typed, resumable rebuild ... with the
 * rules engine separated from the UI") and a "Locked v1 scope" table listing
 * Persistence: LocalStorage - which had also gone stale, still calling the Speed
 * Die "planned later" while its toggle sat on the same screen.
 */
describe('the setup masthead', () => {
  it('titles the screen with the ruleset that will be started', () => {
    renderWithProviders(<NewGamePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: indiaEditionTheme.name })
    ).toBeInTheDocument();
  });

  it('quotes the ruleset from the constants rather than from copy', () => {
    renderWithProviders(<NewGamePage />);

    const glance = screen.getByTestId(TEST_IDS.rulesetGlance);
    expect(glance).toHaveTextContent(`${MIN_PLAYERS} to ${MAX_PLAYERS}`);
    expect(glance).toHaveTextContent(formatMoney(STARTING_CASH, CURRENCY));
    expect(glance).toHaveTextContent(formatMoney(PASS_GO_AMOUNT, CURRENCY));
    expect(glance).toHaveTextContent(formatMoney(JAIL_FINE, CURRENCY));
  });

  // The screen is for someone about to play, not for someone reading the repo.
  it('says nothing about how the app is built', () => {
    const { container } = renderWithProviders(<NewGamePage />);

    expect(container.textContent).not.toMatch(/localstorage|rules engine|v1 scope/i);
  });

  // It said "planned later" long after the Speed Die shipped, on the same screen
  // as its own toggle. Nothing may claim a feature is unbuilt from here.
  it('does not call a shipped feature unbuilt', () => {
    const { container } = renderWithProviders(<NewGamePage />);

    expect(screen.getByTestId(TEST_IDS.speedDieToggle)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/planned later/i);
  });

  it('still offers the way into the rules', () => {
    renderWithProviders(<NewGamePage />);

    expect(screen.getByRole('link', { name: /Read the rules/i })).toBeInTheDocument();
  });
});
