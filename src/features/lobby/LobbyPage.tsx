import { Link } from 'react-router-dom';
import { InviteLink } from '../../components/lobby/InviteLink';
import { LobbySeats } from '../../components/lobby/LobbySeats';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { AppShell } from '../shell/AppShell';
import { useLobby } from './useLobby';

/**
 * The table before the game starts.
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

  return (
    <AppShell editionId={lobby.theme.id}>
      <main className="page lobby-page">
        <section className="panel lobby-panel" data-testid={TEST_IDS.lobbyPanel}>
          <p className="eyebrow">Online game</p>
          <h1>Waiting for players</h1>

          <LobbySeats
            findToken={(tokenId) =>
              lobby.theme.tokenCatalog.find((token) => token.id === tokenId)
            }
            mySeatId={lobby.mySeatId}
            seats={lobby.seats}
          />

          <div className="field-grid lobby-claim">
            <label>
              Your name
              <input
                className="text-input"
                data-testid={TEST_IDS.lobbyNameInput}
                onChange={(event) => lobby.setName(event.target.value)}
                value={lobby.name}
              />
            </label>
            <label>
              Your token
              <select
                className="select-input"
                data-testid={TEST_IDS.lobbyTokenSelect}
                onChange={(event) => lobby.setTokenId(event.target.value)}
                value={lobby.tokenId}
              >
                <option value="">Pick one</option>
                {lobby.theme.tokenCatalog.map((token) => (
                  <option
                    disabled={lobby.takenTokens.includes(token.id)}
                    key={token.id}
                    value={token.id}
                  >
                    {token.emoji} {token.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="button-row">
            <button
              className="secondary-button"
              data-testid={TEST_IDS.lobbyClaimButton}
              disabled={Boolean(lobby.claimReason) || lobby.isBusy}
              onClick={() => void lobby.claim()}
              type="button"
            >
              {lobby.mySeatId ? 'Update my seat' : 'Take a seat'}
            </button>
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

          {/* The reason is on screen, not only in a title attribute - every
              other blocked control in this app says why, and a lobby that
              silently refuses to start is the worst place to break that. */}
          {lobby.claimReason || lobby.startReason ? (
            <p className="helper-text" data-testid={TEST_IDS.lobbyBlockedReason}>
              {lobby.claimReason ?? lobby.startReason}
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
