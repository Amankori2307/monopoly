import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MAX_PLAYERS } from '../../domain/constants/game.constants';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { LobbySeat } from '../multiplayer/lobby.interfaces';
import { seatInitialState } from '../multiplayer/seatSlice';
import { LobbyPage } from './LobbyPage';

/**
 * The lobby with its network stilled: the thunks are exercised elsewhere, and
 * what matters here is that the screen refuses what the rules refuse and says
 * why - a lobby that silently will not start is the worst place to break the
 * "never offer an action that will be rejected" rule.
 */

vi.mock('../multiplayer/multiplayer.thunks', () => ({
  openOnlineTable: () => () => Promise.resolve('lobby'),
  attachOnlineSession: () => () => undefined,
  claimLobbySeat: () => () => Promise.resolve(),
  startOnlineGame: () => () => Promise.resolve({}),
}));

const seat = (over: Partial<LobbySeat> = {}): LobbySeat => ({
  seatId: 'player-1',
  name: 'Asha',
  tokenId: 'elephant',
  deviceId: 'device-a',
  claimedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const renderLobby = (seats: LobbySeat[], over: Partial<typeof seatInitialState> = {}) =>
  renderWithProviders(
    <Routes>
      <Route element={<LobbyPage />} path="/lobby/:gameId" />
    </Routes>,
    {
      route: '/lobby/game-1?code=ABC123',
      preloadedState: {
        seat: { ...seatInitialState, seats, phase: 'lobby', ...over },
      },
    }
  );

describe('the lobby', () => {
  it('draws the empty chairs, not just the players', async () => {
    renderLobby([seat()]);

    const list = await screen.findByTestId(TEST_IDS.lobbySeats);
    // Somebody waiting for friends needs to see there is room.
    expect(within(list).getAllByRole('listitem')).toHaveLength(MAX_PLAYERS);
    expect(list).toHaveTextContent('Asha');
    expect(list).toHaveTextContent('Empty');
  });

  it('will not start below the minimum, and says so', async () => {
    renderLobby([seat()]);

    expect(await screen.findByTestId(TEST_IDS.lobbyStartButton)).toBeDisabled();
    expect(screen.getByTestId(TEST_IDS.lobbyBlockedReason)).toBeInTheDocument();
  });

  it('starts once two people are seated', async () => {
    renderLobby([seat(), seat({ seatId: 'player-2', name: 'Vikram', deviceId: 'b' })]);

    expect(await screen.findByTestId(TEST_IDS.lobbyStartButton)).toBeEnabled();
  });

  it('refuses a seat with no name, and says why', async () => {
    renderLobby([]);

    expect(await screen.findByTestId(TEST_IDS.lobbyClaimButton)).toBeDisabled();
    expect(screen.getByTestId(TEST_IDS.lobbyBlockedReason)).toHaveTextContent(/name/i);
  });

  it('will not let two people pick the same token', async () => {
    renderLobby([seat({ deviceId: 'somebody-else', tokenId: 'elephant' })]);

    await userEvent.type(await screen.findByTestId(TEST_IDS.lobbyNameInput), 'Vikram');
    const select = screen.getByTestId(TEST_IDS.lobbyTokenSelect);

    // Disabled at source, so the rule is visible before it is broken.
    const taken = within(select).getByRole('option', { name: /elephant/i });
    expect(taken).toBeDisabled();
  });

  it('offers the invite link and the code, because they are used in different rooms', async () => {
    renderLobby([seat()]);

    expect(await screen.findByTestId(TEST_IDS.lobbyJoinCode)).toHaveTextContent('ABC123');
    expect(
      (screen.getByTestId(TEST_IDS.lobbyInviteLink) as HTMLInputElement).value
    ).toContain('#/lobby/game-1');
  });

  it('says a table is gone rather than showing an empty one', async () => {
    renderLobby([], { lobbyError: 'No game with that code.' });

    expect(await screen.findByText(/not there/i)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_IDS.lobbySeats)).not.toBeInTheDocument();
  });
});

/**
 * The bug this gate exists for, found with two real browsers: a guest clicked
 * "take a seat" a moment before its first fetch came back, so the claim was
 * built from an empty table - and with the old whole-array claim, that deleted
 * the host. The server-side merge in migration 0003 is the real fix; this is
 * the half that stops the click happening at all.
 */
describe('a table that has not loaded yet', () => {
  it('offers nothing until it knows who is there', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<LobbyPage />} path="/lobby/:gameId" />
      </Routes>,
      {
        route: '/lobby/game-1?code=ABC123',
        // phase null is "not read yet", which is not the same as "empty".
        preloadedState: { seat: { ...seatInitialState, seats: [], phase: null } },
      }
    );

    expect(await screen.findByTestId(TEST_IDS.lobbyClaimButton)).toBeDisabled();
    expect(screen.getByTestId(TEST_IDS.lobbyStartButton)).toBeDisabled();
    expect(screen.getByTestId(TEST_IDS.lobbyBlockedReason)).toHaveTextContent(/loading/i);
  });
});
