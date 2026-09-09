import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import { TableMode } from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import { saveGame } from '../persistence/persistence';
import { writeJoinCode, writeSeatClaim } from '../multiplayer/seatClaim.utils';
import { GamePage } from './GamePage';

/**
 * Whether this "build" has a server, switchable per test.
 *
 * The real module resolves `null` under test on purpose - `onlineConfig.test.ts`
 * asserts it - so the offline branch would otherwise fire first and no test
 * could ever reach the branches behind it.
 */
const online = vi.hoisted(() => ({ enabled: false }));

vi.mock('../multiplayer/onlineConfig.utils', () => ({
  get onlineConfig() {
    return online.enabled ? { url: 'https://table.example', anonKey: 'anon' } : null;
  },
  isOnlineEnabled: () => online.enabled,
  parseOnlineConfig: () => null,
}));

/**
 * Opening an online game cold.
 *
 * This was broken outright, and it is the bug this file exists for: the join
 * code lived only in Redux and in the lobby URL's `?code=`, which the game URL
 * does not carry, and `restoreSeat` was exported and dispatched nowhere. So a
 * refresh mid-game - or Rejoin from the saved list - loaded the state, attached
 * no session, and `resolveViewer` failed closed to Spectator: every control
 * dead, on your own save, with no explanation on screen.
 *
 * A **fresh store with nothing preloaded** is what makes these cold loads. The
 * seat and the code come from storage, the way they would after a refresh.
 */

const seedOnlineGame = (): GameState => {
  const game: GameState = {
    ...createGameState(
      {
        gameId: 'rejoin-test',
        name: 'Online table',
        playerConfigs: [
          { name: 'Asha', tokenId: 'elephant' },
          { name: 'Vikram', tokenId: 'train' },
        ],
        themeId: indiaEditionTheme.id,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      new SeededRandomSource(7)
    ),
    tableMode: TableMode.Online,
  };
  saveGame(game);
  return game;
};

const renderPage = (gameId: string) =>
  renderWithProviders(
    <Routes>
      <Route element={<GamePage />} path="/game/:gameId" />
    </Routes>,
    { route: `/game/${gameId}` }
  );

beforeEach(() => {
  localStorage.clear();
  online.enabled = false;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('a cold load of an online game', () => {
  it('says the code is not on this device rather than looking frozen', async () => {
    online.enabled = true;
    const game = seedOnlineGame();
    writeSeatClaim(game.id, game.playerOrder[0]);
    // Deliberately no writeJoinCode: this is a save carried to a device that
    // was never given the code.

    const { store } = renderPage(game.id);

    await screen.findByTestId(TEST_IDS.boardGrid);
    await waitFor(() => {
      expect(store.getState().seat.lobbyError).toMatch(/code/i);
    });
  });

  /**
   * The offline case must not throw. `attachOnlineSession` goes through
   * `requireConfig()`, which THROWS - and a throw inside an effect reaches
   * nothing but ErrorBoundary, so opening an online save on a build with no
   * server would render as "the app crashed".
   */
  it('does not crash when the build has no server', async () => {
    const game = seedOnlineGame();
    writeSeatClaim(game.id, game.playerOrder[0]);
    writeJoinCode(game.id, 'ABC234');

    const { store } = renderPage(game.id);

    // The board still renders - no ErrorBoundary, no blank page.
    await screen.findByTestId(TEST_IDS.boardGrid);
    await waitFor(() => {
      expect(store.getState().seat.lobbyError).toMatch(/cannot play online/i);
    });
  });

  // The gate: a hot-seat game must be left entirely alone by all of this.
  it('leaves a hot-seat game alone, even with a stray stored code', async () => {
    const game = {
      ...seedOnlineGame(),
      tableMode: TableMode.HotSeat,
    };
    saveGame(game);
    writeJoinCode(game.id, 'ABC234');

    const { store } = renderPage(game.id);

    await screen.findByTestId(TEST_IDS.boardGrid);
    expect(store.getState().seat.lobbyError).toBeNull();
    expect(store.getState().seat.sessionEpoch).toBe(0);
    // And it is playable, which is the whole point of a hot-seat game.
    expect(screen.getByTestId(TEST_IDS.rollButton)).toBeEnabled();
  });
});
