import { Link } from 'react-router-dom';
import { InviteLink } from '../../components/lobby/InviteLink';
import { LobbySeats } from '../../components/lobby/LobbySeats';
import { MAX_PLAYERS } from '../../domain/constants/game.constants';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { AppShell } from '../shell/AppShell';
import { useLobby } from './useLobby';

/**
 * The table before the game starts.
 *
 * A roster, and nothing else. It used to carry a name field, a token select and
 * a "Take a seat" button - on a screen you reached by following an invitation,
 * which already said you were joining - and every device saw the same "Start
 * the game", live for anybody once two people were seated. `/join` takes the
 * code and the name together now, so arriving here means you are already
 * sitting down, and only the host is offered a start.
 *
 * The same URL is the invite link and the lobby, so somebody who follows it
 * after the game has begun is sent straight into the game rather than into a
 * lobby that no longer exists - see `openOnlineTable`.
 */
export function LobbyPage() {
  const lobby = useLobby();

  if (lobby.lobbyError) {
    return (
      <AppShell editionId={lobby.theme.id}>
        <main className="page lobby-page">
          <section className="panel lobby-panel" data-testid={TEST_IDS.lobbyPanel}>
            <h1>That table is not there</h1>
            <p className="helper-text">{lobby.lobbyError}</p>
            <Link className="primary-button" to="/">
              Back to games
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  const room = MAX_PLAYERS - lobby.seats.length;

  return (
    <AppShell editionId={lobby.theme.id}>
      <main className="page lobby-page">
        <section className="panel lobby-panel" data-testid={TEST_IDS.lobbyPanel}>
          <p className="eyebrow">Online game</p>
          <h1>Waiting for players</h1>

          <LobbySeats
            hostSeatId={lobby.hostSeatId}
            mySeatId={lobby.mySeatId}
            seats={lobby.seats}
          />

          {/* One sentence where there used to be six rows of the word "Empty".
              Only said while there IS room - "no seats left" is what the
              refusal on the way in is for. */}
          {lobby.isLoaded && room > 0 ? (
            <p className="helper-text" data-testid={TEST_IDS.lobbyRoom}>
              Room for {room} more. Waiting for players to join&hellip;
            </p>
          ) : null}

          {/* Only the host is offered this, and the server refuses it from
              anyone else - the join code is a bearer capability, so a hidden
              button was never a rule. See migration 0005. */}
          {lobby.isHost ? (
            <div className="button-row">
              <button
                className="primary-button"
                data-testid={TEST_IDS.lobbyStartButton}
                disabled={Boolean(lobby.startReason) || lobby.isBusy}
                onClick={() => void lobby.start()}
                type="button"
              >
                Start the game
              </button>
            </div>
          ) : null}

          {/* The reason is on screen, not only in a title attribute - every
              other blocked control in this app says why, and a lobby that
              silently refuses to start is the worst place to break that. A
              guest is told who they are waiting for rather than a player count
              that will never be the thing standing in the way. */}
          {lobby.startReason ? (
            <p className="helper-text" data-testid={TEST_IDS.lobbyBlockedReason}>
              {lobby.isHost ? lobby.startReason : 'Waiting for the host to start'}
            </p>
          ) : null}
        </section>

        <section className="panel">
          <InviteLink joinCode={lobby.joinCode} link={lobby.inviteLink} />
        </section>
      </main>
    </AppShell>
  );
}
