import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../../app/hooks';
import { defaultTheme } from '../../domain/themes/themes.registry';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { AppShell } from '../shell/AppShell';
import { JOIN_CODE_LENGTH } from './joinCode.constants';
import { joinBlockedReason, takeJoinCode } from './joinCode.utils';
import { claimLobbySeat, resolveJoinCode } from './multiplayer.thunks';
import { isOnlineEnabled } from './onlineConfig.utils';
import { TABLE_MESSAGES } from './multiplayer.constants';

/**
 * The one door into somebody else's table.
 *
 * It used to take the code alone and hand you to a lobby that then asked for a
 * name and a playing piece - while an invite LINK skipped this screen and asked
 * the same two questions somewhere else. Joining a table is taking a seat at
 * it, so this asks both at once and claims the seat on the way through: the
 * lobby is a roster with nothing to fill in.
 *
 * The invite link lands here too, with `?code=` prefilled, which is why the
 * link is short enough to read out loud.
 */
export function JoinPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An invite link is this screen with the code already in it. Normalised on
  // the way in like anything typed, so a hand-edited URL cannot send a code
  // shape the server has never seen.
  const linkCode = takeJoinCode(searchParams.get('code') ?? '');
  useEffect(() => {
    if (linkCode) {
      setCode((current) => current || linkCode);
    }
  }, [linkCode]);

  /**
   * The fields render even in a build with no server, and that is not a
   * departure from "never render a control that cannot work".
   *
   * The *entry point* obeys that rule: the chooser omits the Join tile
   * entirely when there is no server. This screen is only reachable by typing
   * the URL, and on it a labelled field whose button says WHY it is disabled is
   * strictly better than a bare panel - and it is what every other blocked
   * control in this app does.
   */
  const blockedReason = isOnlineEnabled()
    ? joinBlockedReason(code, name)
    : TABLE_MESSAGES.offlineBuild;

  const join = async () => {
    setIsJoining(true);
    setError(null);
    try {
      const found = await dispatch(resolveJoinCode(code));
      if (found === 'missing') {
        // Two different failures, two different sentences. This said "no game
        // with that code" whatever the cause, which is a lie when the real
        // reason is that this build has no server to ask.
        setError(
          isOnlineEnabled() ? TABLE_MESSAGES.noSuchCode : TABLE_MESSAGES.offlineBuild
        );
        return;
      }
      // Already playing: the lobby is gone, so go where the game is, and take
      // no seat - the game's players were fixed when it started.
      if (found.phase !== 'lobby') {
        navigate(`/game/${found.gameId}`);
        return;
      }

      // Seated here rather than in the lobby. This is the click that says "I am
      // joining", so it is the one that should put somebody in a chair.
      await dispatch(
        claimLobbySeat({
          gameId: found.gameId,
          joinCode: code,
          name: name.trim(),
        })
      );
      navigate(`/lobby/${found.gameId}?code=${encodeURIComponent(code)}`);
    } catch {
      setError(TABLE_MESSAGES.unreachable);
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
            Type the {JOIN_CODE_LENGTH}-character code from whoever is hosting, and the
            name you want at the table.
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

          <label className="join-field">
            Your name
            <input
              className="text-input"
              data-testid={TEST_IDS.joinNameInput}
              onChange={(event) => setName(event.target.value)}
              value={name}
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
