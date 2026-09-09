import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameStatus, TableMode } from '../../domain/types/game.enums';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import { writeJoinCode } from '../multiplayer/seatClaim.utils';
import { STORAGE_INDEX_KEY } from '../persistence/persistence';
import { ChooserPage } from './ChooserPage';

const savedGame = (overrides: Record<string, unknown> = {}) => ({
  id: 'game-1',
  name: 'Sunday game',
  themeId: 'india-edition',
  playerCount: 3,
  playerNames: ['Asha', 'Ravi', 'Meera'],
  status: GameStatus.InProgress,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  turnNumber: 14,
  activePlayerId: 'player-1',
  winnerPlayerId: null,
  tableMode: TableMode.HotSeat,
  ...overrides,
});

const seedIndex = (entries: Record<string, unknown>[]) =>
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(entries));

describe('ChooserPage', () => {
  it('asks how you want to play, and does not carry the setup form', () => {
    renderWithProviders(<ChooserPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /How are you playing/i
    );
    expect(screen.getByTestId(TEST_IDS.chooserPlayLocal)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Create game/i })
    ).not.toBeInTheDocument();
  });

  it('offers nothing to resume before there is a save', () => {
    renderWithProviders(<ChooserPage />);

    expect(screen.queryByTestId(TEST_IDS.chooserContinue)).not.toBeInTheDocument();
  });

  // Resuming is the commonest repeat visit, so it is on the front door.
  it('offers the newest save back, and says which kind it is', () => {
    seedIndex([savedGame()]);

    renderWithProviders(<ChooserPage />);

    const resume = screen.getByTestId(TEST_IDS.chooserContinue);
    expect(resume).toHaveTextContent('Sunday game');
    expect(resume).toHaveTextContent('Local');
    expect(resume).toHaveAttribute('href', '/game/game-1');
  });

  /**
   * An online save with no code on this device is on disk and unplayable -
   * reading or writing the table needs the code - so the front door must not
   * offer it as a one-click resume.
   */
  it('does not offer an online save whose code this device lacks', () => {
    seedIndex([savedGame({ tableMode: TableMode.Online })]);

    renderWithProviders(<ChooserPage />);

    expect(screen.queryByTestId(TEST_IDS.chooserContinue)).not.toBeInTheDocument();
  });

  it('offers an online save once the code is on this device', () => {
    seedIndex([savedGame({ tableMode: TableMode.Online })]);
    writeJoinCode('game-1', 'ABC234');

    renderWithProviders(<ChooserPage />);

    const resume = screen.getByTestId(TEST_IDS.chooserContinue);
    expect(resume).toHaveTextContent('Online');
  });

  /**
   * All three, always. Where you play is the player's choice; it used to be a
   * property of the build, so a copy without a backend simply had no door.
   */
  it('offers every way to play', () => {
    renderWithProviders(<ChooserPage />);

    expect(screen.getByTestId(TEST_IDS.chooserPlayLocal)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.chooserHostOnline)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.chooserJoinOnline)).toBeInTheDocument();
  });
});
