import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { PlayerConfigRow } from '../../components/setup/PlayerConfigRow';
import { RecentGamesList } from '../../components/setup/RecentGamesList';
import { SetupHero } from '../../components/setup/SetupHero';
import {
  JAIL_FINE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../../domain/constants/game.constants';
import { availableThemes } from '../../domain/themes/indiaEditionTheme';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { formatMoney } from '../../shared/utils/money.utils';
import { bootstrapRecentGames, createNewGame, removeSavedGame } from '../game/gameSlice';
import { useGameSetupForm } from './hooks/useGameSetupForm';

/** Wiring only: form state lives in useGameSetupForm, rendering in components/setup. */
export function HomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const recentGames = useAppSelector((state) => state.game.recentGames);
  const loadError = useAppSelector((state) => state.game.loadError);
  const form = useGameSetupForm();

  useEffect(() => {
    dispatch(bootstrapRecentGames());
  }, [dispatch]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const playerConfigs = form.validate();
    if (!playerConfigs) {
      return;
    }

    const nextGame = dispatch(
      createNewGame({
        name: form.gameName,
        playerConfigs,
        themeId: form.themeId,
        createdAt: new Date().toISOString(),
      })
    );
    navigate(`/game/${nextGame.id}`);
  };

  // The summary quotes the ruleset, so it follows the selected theme's symbol
  // rather than repeating amounts in the copy.
  const currencySymbol = form.selectedTheme.currencySymbol;

  return (
    <div className="app-shell" data-theme={form.themeId}>
      <div className="page">
        <SetupHero />

        <div className="layout-grid">
          <section className="panel">
            <h2>Start a new game</h2>
            <form
              className="setup-form"
              data-testid={TEST_IDS.setupForm}
              onSubmit={onSubmit}
            >
              <div className="field-grid two">
                <label>
                  Game name
                  <input
                    className="text-input"
                    onChange={(event) => form.setGameName(event.target.value)}
                    placeholder="Optional"
                    value={form.gameName}
                  />
                </label>
                <label>
                  Theme
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

              <div className="field-grid two">
                <label>
                  Players
                  <input
                    className="text-input"
                    max={MAX_PLAYERS}
                    min={MIN_PLAYERS}
                    onChange={(event) => form.setPlayerCount(Number(event.target.value))}
                    type="number"
                    value={form.playerCount}
                  />
                </label>
                <div className="summary-card">
                  <h3>{form.selectedTheme.name}</h3>
                  <p className="helper-text">
                    Starting cash {formatMoney(STARTING_CASH, currencySymbol)}, GO salary{' '}
                    {formatMoney(PASS_GO_AMOUNT, currencySymbol)}, Jail fine{' '}
                    {formatMoney(JAIL_FINE, currencySymbol)}.
                  </p>
                </div>
              </div>

              <div className="player-config-grid">
                {form.playerNames.map((name, index) => (
                  <PlayerConfigRow
                    index={index}
                    key={`player-${index + 1}`}
                    name={name}
                    onNameChange={form.setPlayerName}
                    onTokenChange={form.setPlayerToken}
                    tokenCatalog={form.selectedTheme.tokenCatalog}
                    tokenId={form.playerTokens[index] ?? ''}
                  />
                ))}
              </div>

              {form.formError ? <div className="error-text">{form.formError}</div> : null}
              {loadError ? <div className="error-text">{loadError}</div> : null}

              <div className="button-row">
                <button className="primary-button" type="submit">
                  Create game
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>Recent games</h2>
            <RecentGamesList
              games={recentGames}
              onContinue={(id) => navigate(`/game/${id}`)}
              onDelete={(id) => dispatch(removeSavedGame(id))}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
