import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../app/hooks';
import { defaultTheme } from '../../domain/themes/themes.registry';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { AppShell } from '../shell/AppShell';
import { JOIN_CODE_LENGTH } from './joinCode.constants';
import { joinBlockedReason, takeJoinCode } from './joinCode.utils';
import { resolveJoinCode } from './multiplayer.thunks';
import { isOnlineEnabled } from './onlineConfig.utils';
import { TABLE_MESSAGES } from './multiplayer.constants';

/**
 * Joining somebody else's table with the code they read out.
 *
 * The code has existed since the lobby did, and there was nowhere to type it -
 * the only way in was the whole invite URL, which is no use when the person is
 * sitting next to you. Resolving a code to a table needs migration 0004.
 */
export function JoinPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The field renders even in a build with no server, and that is not a
   * departure from "never render a control that cannot work".
   *
   * The *entry point* obeys that rule: the chooser omits the Join tile
   * entirely when there is no server. This screen is only reachable by typing
   * the URL, and on it a labelled field whose button says WHY it is disabled is
   * strictly better than a bare panel - and it is what every other blocked
   * control in this app does.
   */
  const blockedReason = isOnlineEnabled()
    ? joinBlockedReason(code)
    : TABLE_MESSAGES.offlineBuild;

  const join = async () => {
    setIsJoining(true);
    setError(null);
    try {
      const found = await dispatch(resolveJoinCode(code));
      if (found === 'missing') {
        setError('No game with that code. Check it and try again.');
        return;
      }
      // Already playing: the lobby is gone, so go where the game is. The
      // lobby route does the same thing for an invite link opened late.
      navigate(
        found.phase === 'lobby'
          ? `/lobby/${found.gameId}?code=${encodeURIComponent(code)}`
          : `/game/${found.gameId}`
      );
    } catch {
      setError('Could not reach the game server. Try again in a moment.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <AppShell editionId={defaultTheme.id}>
      <div className="page join-page">
        <section className="panel join-panel">
          <p className="eyebrow">Online game</p>
          <h1>Join a game</h1>
          <p className="masthead-lede">
            Type the {JOIN_CODE_LENGTH}-character code from whoever is hosting.
          </p>

          <label className="join-field">
            Game code
            <input
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              className="text-input join-code-input"
              data-testid={TEST_IDS.joinCodeInput}
              inputMode="text"
              // Normalised as it is typed, so spaces and dashes from a code
              // read aloud are absorbed rather than refused.
              onChange={(event) => setCode(takeJoinCode(event.target.value))}
              placeholder="ABC123"
              spellCheck={false}
              value={code}
            />
          </label>

          {error ? <div className="error-text">{error}</div> : null}

          <div className="button-row">
            <button
              className="primary-button"
              data-testid={TEST_IDS.joinSubmitButton}
              disabled={isJoining || blockedReason !== null}
              onClick={() => void join()}
              type="button"
            >
              Join
            </button>
            <Link className="secondary-button" to="/">
              Back
            </Link>
          </div>

          {/* Shown rather than only disabling the button, so it says why. */}
          {blockedReason ? (
            <p className="helper-text" data-testid={TEST_IDS.joinBlockedReason}>
              {blockedReason}
            </p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
