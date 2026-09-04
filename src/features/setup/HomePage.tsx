import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { PlayerConfigRow } from '../../components/setup/PlayerConfigRow';
import { RecentGamesList } from '../../components/setup/RecentGamesList';
import { GameIdentityFields } from '../../components/setup/GameIdentityFields';
import { SetupHero } from '../../components/setup/SetupHero';
import { SpeedDieToggle } from '../../components/setup/SpeedDieToggle';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
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
        useSpeedDie: form.useSpeedDie,
      })
    );
    navigate(`/game/${nextGame.id}`);
  };

  // The masthead's ruleset card quotes the constants, so it follows the selected
  // theme's symbol rather than repeating amounts in the copy.
  const currencySymbol = form.selectedTheme.currencySymbol;

  return (
    <div className="app-shell" data-theme={form.themeId}>
      <div className="page">
        <SetupHero currencySymbol={currencySymbol} themeName={form.selectedTheme.name} />

        <div className="layout-grid">
          <section className="panel setup-panel">
            <h2>Start a new game</h2>
            <form
              className="setup-form"
              data-testid={TEST_IDS.setupForm}
              onSubmit={onSubmit}
            >
              <GameIdentityFields
                gameName={form.gameName}
                onGameNameChange={form.setGameName}
                onPlayerCountChange={form.setPlayerCount}
                onThemeChange={form.setThemeId}
                playerCount={form.playerCount}
                playerCountNotice={form.playerCountNotice}
                themeId={form.themeId}
              />

              <SpeedDieToggle
                currencySymbol={currencySymbol}
                isEnabled={form.useSpeedDie}
                onChange={form.setUseSpeedDie}
              />

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

          <section className="panel recent-panel">
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
