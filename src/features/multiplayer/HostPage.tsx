import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { availableThemes } from '../../domain/themes/themes.registry';
import { useAppDispatch } from '../../app/hooks';
import { SpeedDieToggle } from '../../components/setup/SpeedDieToggle';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { AppShell } from '../shell/AppShell';
import { useHostTableForm } from './hooks/useHostTableForm';
import { createOnlineLobby } from './multiplayer.thunks';
import { isOnlineEnabled } from './onlineConfig.utils';
import { lobbyPathFor } from './lobby.utils';
import { NoServerPanel } from './NoServerPanel';

/**
 * Opening an online table.
 *
 * Its own screen because hosting and setting up a hot-seat game are different
 * intentions that used to share one form: "Play online" sat in the same
 * `.button-row` as "Create game" and quietly used only the first player's name
 * and token, dropping the game name, the player count, the edition and the
 * Speed Die. Here the fields on screen are the fields that are used.
 */
export function HostPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const form = useHostTableForm();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOnlineEnabled()) {
    return (
      <AppShell editionId={form.themeId}>
        <NoServerPanel title="This copy cannot play online" />
      </AppShell>
    );
  }

  const openTable = async () => {
    setIsOpening(true);
    setError(null);
    try {
      const { gameId, joinCode } = await dispatch(
        createOnlineLobby({ name: form.hostName.trim(), tokenId: form.tokenId })
      );
      // The edition and the Speed Die ride in the URL beside the code: the
      // lobby starts the game, not this screen, and a host reloading their own
      // lobby is routine - so Redux would lose them.
      navigate(
        lobbyPathFor(gameId, joinCode, {
          themeId: form.themeId,
          useSpeedDie: form.useSpeedDie,
        })
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not open an online table.'
      );
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <AppShell editionId={form.themeId}>
      <div className="page host-page">
        <section className="panel host-panel">
          <p className="eyebrow">Online game</p>
          <h1>Host a table</h1>
          <p className="masthead-lede">
            You take the first seat. Everybody else joins with the code this gives you.
          </p>

          <div className="host-fields" data-testid={TEST_IDS.hostForm}>
            <label>
              Your name
              <input
                className="text-input"
                data-testid={TEST_IDS.hostNameInput}
                onChange={(event) => form.setHostName(event.target.value)}
                value={form.hostName}
              />
            </label>

            <label>
              Your token
              <select
                className="select-input"
                data-testid={TEST_IDS.hostTokenSelect}
                onChange={(event) => form.setTokenId(event.target.value)}
                value={form.tokenId}
              >
                {form.selectedTheme.tokenCatalog.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.emoji} {token.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ruleset
              <select
                className="select-input"
                onChange={(event) => form.setThemeId(event.target.value)}
                value={form.themeId}
              >
                {availableThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <SpeedDieToggle
            currencySymbol={form.selectedTheme.currencySymbol}
            isEnabled={form.useSpeedDie}
            onChange={form.setUseSpeedDie}
          />

          {error ? <div className="error-text">{error}</div> : null}

          <div className="button-row">
            <button
              className="primary-button"
              data-testid={TEST_IDS.openTableButton}
              disabled={isOpening || form.blockedReason !== null}
              onClick={() => void openTable()}
              type="button"
            >
              Open the table
            </button>
            <Link className="secondary-button" to="/">
              Back
            </Link>
          </div>

          {form.blockedReason ? (
            <p className="helper-text">{form.blockedReason}</p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
