import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { LobbySeat } from '../multiplayer/lobby.interfaces';
import { HOST_SEAT_ID } from '../multiplayer/lobby.utils';
import { readDeviceId } from '../multiplayer/seatClaim.utils';
import { seatInitialState } from '../multiplayer/seatSlice';
import { LobbyPage } from './LobbyPage';

/**
 * The lobby with its network stilled: the thunks are exercised elsewhere, and
 * what matters here is that the screen offers only what the rules allow and
 * says why - a lobby that silently will not start is the worst place to break
 * the "never offer an action that will be rejected" rule.
 *
 * There is no claim to test any more. Joining a table is taking a seat at it,
 * so `/join` asks for the code and the name together and seats you on the way
 * in; this screen is a roster.
 */

vi.mock('../multiplayer/multiplayer.thunks', () => ({
  openOnlineTable: () => () => Promise.resolve('lobby'),
  attachOnlineSession: () => () => undefined,
  startOnlineGame: () => () => Promise.resolve({}),
}));

/**
 * The host's own device.
 *
 * `readDeviceId()` is called HERE rather than at module scope, and that is not
 * a style choice: it invents an id on first use and stores it, and the harness
 * clears `localStorage` between tests - so an id captured when the file loaded
 * is wiped before the first render, the hook invents a different one, and the
 * host is never the host. The symptom is a missing Start button and a seat with
 * no "you" on it.
 */
const seat = (over: Partial<LobbySeat> = {}): LobbySeat => ({
  seatId: HOST_SEAT_ID,
  name: 'Asha',
  deviceId: readDeviceId(),
  claimedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

const guest = (over: Partial<LobbySeat> = {}) =>
  seat({ seatId: 'player-2', name: 'Vikram', deviceId: 'device-guest', ...over });

const renderLobby = (seats: LobbySeat[], over: Partial<typeof seatInitialState> = {}) =>
  renderWithProviders(
    <Routes>
      <Route element={<LobbyPage />} path="/lobby/:gameId" />
    </Routes>,
    {
      route: '/lobby/game-1?code=ABC123',
      preloadedState: {
        seat: {
          ...seatInitialState,
          seats,
          phase: 'lobby',
          hostSeatId: HOST_SEAT_ID,
          ...over,
        },
      },
    }
  );

describe('the lobby', () => {
  it('lists who is actually there, and says there is room', async () => {
    renderLobby([seat()]);

    const list = await screen.findByTestId(TEST_IDS.lobbySeats);
    // One row per real player. It used to draw MAX_PLAYERS rows and fill the
    // rest with the word "Empty", so two people at a table looked like six
    // things missing - most of a phone screen spent on furniture.
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(list).toHaveTextContent('Asha');
    expect(list).not.toHaveTextContent('Empty');
    // Whether there is room is one sentence, and still said.
    expect(screen.getByTestId(TEST_IDS.lobbyRoom)).toHaveTextContent(/room for 7/i);
  });

  it('marks the host and this device, so a player can find themselves', async () => {
    renderLobby([seat(), guest()]);

    const list = await screen.findByTestId(TEST_IDS.lobbySeats);
    expect(list).toHaveTextContent('host');
    expect(list).toHaveTextContent('you');
  });

  it('will not start below the minimum, and says so', async () => {
    renderLobby([seat()]);

    expect(await screen.findByTestId(TEST_IDS.lobbyStartButton)).toBeDisabled();
    expect(screen.getByTestId(TEST_IDS.lobbyBlockedReason)).toBeInTheDocument();
  });

  it('starts once two people are seated', async () => {
    renderLobby([seat(), guest()]);

    expect(await screen.findByTestId(TEST_IDS.lobbyStartButton)).toBeEnabled();
  });

  /**
   * The whole point of the change. A guest used to see the same button as the
   * host, and it went LIVE for them the moment two people were seated - so
   * whoever clicked first started the game and everybody else adopted it. Even
   * a device holding no seat at all saw it.
   */
  it('offers no start at all to somebody who did not open the table', async () => {
    renderLobby([seat({ deviceId: 'device-host' }), guest({ deviceId: readDeviceId() })]);

    await screen.findByTestId(TEST_IDS.lobbySeats);
    expect(screen.queryByTestId(TEST_IDS.lobbyStartButton)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.lobbyBlockedReason)).toHaveTextContent(/host/i);
  });

  /**
   * A refusal about who may start must not be routed through `lobbyError`:
   * LobbyPage treats that as fatal and replaces the whole screen with "That
   * table is not there", over a table whose seats it has just drawn.
   */
  it('shows a refused start beside the seats, not instead of them', async () => {
    renderLobby([seat(), guest()], {
      startRefusal: 'Only the host can start this table',
    });

    expect(await screen.findByTestId(TEST_IDS.lobbySeats)).toHaveTextContent('Asha');
    expect(screen.getByTestId(TEST_IDS.lobbyBlockedReason)).toHaveTextContent(/host/i);
    expect(screen.queryByText(/not there/i)).not.toBeInTheDocument();
  });

  it('offers the invite link and the code, because they are used in different rooms', async () => {
    renderLobby([seat()]);

    expect(await screen.findByTestId(TEST_IDS.lobbyJoinCode)).toHaveTextContent('ABC123');
    // The join screen, not the lobby: one door for a typed code and a followed
    // link, which is what lets the name be asked once.
    expect(
      (screen.getByTestId(TEST_IDS.lobbyInviteLink) as HTMLInputElement).value
    ).toContain('#/join?code=ABC123');
  });

  it('says a table is gone rather than showing an empty one', async () => {
    renderLobby([], { lobbyError: 'No game with that code.' });

    expect(await screen.findByText(/not there/i)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_IDS.lobbySeats)).not.toBeInTheDocument();
  });
});

/**
 * The bug this gate exists for, found with two real browsers: a guest acted a
 * moment before its first fetch came back, so it worked from an empty table -
 * and with the old whole-array claim, that deleted the host. The server-side
 * merge in migration 0003 is the real fix; this is the half that stops the
 * click happening at all.
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

    expect(await screen.findByTestId(TEST_IDS.lobbyStartButton)).toBeDisabled();
    expect(screen.getByTestId(TEST_IDS.lobbyBlockedReason)).toHaveTextContent(/loading/i);
    // Nor does it claim there is room at a table it has not read.
    expect(screen.queryByTestId(TEST_IDS.lobbyRoom)).not.toBeInTheDocument();
  });
});
