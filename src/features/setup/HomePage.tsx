import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  availableThemes,
  indiaEditionTheme,
} from '../../domain/themes/indiaEditionTheme';
import { bootstrapRecentGames, createNewGame, removeSavedGame } from '../game/gameSlice';

const clampPlayerCount = (value: number) => Math.max(2, Math.min(8, value));

export function HomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const recentGames = useAppSelector((state) => state.game.recentGames);
  const loadError = useAppSelector((state) => state.game.loadError);

  const [gameName, setGameName] = useState('');
  const [playerCount, setPlayerCount] = useState(2);
  const [themeId, setThemeId] = useState(indiaEditionTheme.id);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2']);
  const [playerTokens, setPlayerTokens] = useState([
    indiaEditionTheme.tokenCatalog[0].id,
    indiaEditionTheme.tokenCatalog[1].id,
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(bootstrapRecentGames());
  }, [dispatch]);

  useEffect(() => {
    setPlayerNames((currentNames) =>
      Array.from(
        { length: playerCount },
        (_, index) => currentNames[index] ?? `Player ${index + 1}`
      )
    );
    setPlayerTokens((currentTokens) =>
      Array.from(
        { length: playerCount },
        (_, index) => currentTokens[index] ?? indiaEditionTheme.tokenCatalog[index].id
      )
    );
  }, [playerCount]);

  const selectedTheme = useMemo(
    () => availableThemes.find((theme) => theme.id === themeId) ?? indiaEditionTheme,
    [themeId]
  );

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedNames = playerNames.map((name) => name.trim());
    const uniqueNames = new Set(trimmedNames.map((name) => name.toLowerCase()));
    const uniqueTokens = new Set(playerTokens);

    if (trimmedNames.some((name) => name.length === 0)) {
      setFormError('Every player needs a name.');
      return;
    }
    if (uniqueNames.size !== trimmedNames.length) {
      setFormError('Player names must be unique.');
      return;
    }
    if (uniqueTokens.size !== playerTokens.length) {
      setFormError('Each player must use a different token.');
      return;
    }

    setFormError(null);
    const nextGame = dispatch(
      createNewGame({
        name: gameName,
        playerConfigs: trimmedNames.map((name, index) => ({
          name,
          tokenId: playerTokens[index],
        })),
        themeId,
        createdAt: new Date().toISOString(),
      })
    );
    navigate(`/game/${nextGame.id}`);
  };

  return (
    <div className="app-shell">
      <div className="page">
        <section className="hero-card">
          <div>
            <h1>Monopoly India Edition</h1>
            <p>
              A typed, resumable rebuild of Monopoly India Edition with local saves,
              stable game ids, and the rules engine separated from the UI.
            </p>
            <div className="button-row hero-actions">
              <Link className="secondary-button" to="/rules">
                Read the rules
              </Link>
            </div>
          </div>
          <div className="summary-card">
            <h2>Locked v1 scope</h2>
            <div className="summary-grid">
              <span>Players</span>
              <strong>2 to 8</strong>
              <span>Persistence</span>
              <strong>LocalStorage</strong>
              <span>Ruleset</span>
              <strong>India Edition</strong>
              <span>Speed Die</span>
              <strong>Planned later</strong>
            </div>
          </div>
        </section>

        <div className="layout-grid">
          <section className="panel">
            <h2>Start a new game</h2>
            <form className="setup-form" onSubmit={onSubmit}>
              <div className="field-grid two">
                <label>
                  Game name
                  <input
                    className="text-input"
                    value={gameName}
                    onChange={(event) => setGameName(event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label>
                  Theme
                  <select
                    className="select-input"
                    value={themeId}
                    onChange={(event) => setThemeId(event.target.value)}
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
                    type="number"
                    min={2}
                    max={8}
                    value={playerCount}
                    onChange={(event) =>
                      setPlayerCount(clampPlayerCount(Number(event.target.value)))
                    }
                  />
                </label>
                <div className="summary-card">
                  <h3>{selectedTheme.name}</h3>
                  <p className="helper-text">
                    Starting cash M1500, GO salary M200, Jail fine M50.
                  </p>
                </div>
              </div>

              <div className="player-config-grid">
                {Array.from({ length: playerCount }, (_, index) => (
                  <div className="player-config-row" key={`player-${index + 1}`}>
                    <label>
                      Player {index + 1} name
                      <input
                        className="text-input"
                        value={playerNames[index] ?? ''}
                        onChange={(event) => {
                          const nextNames = [...playerNames];
                          nextNames[index] = event.target.value;
                          setPlayerNames(nextNames);
                        }}
                      />
                    </label>
                    <label>
                      Token
                      <select
                        className="select-input"
                        value={
                          playerTokens[index] ?? selectedTheme.tokenCatalog[index].id
                        }
                        onChange={(event) => {
                          const nextTokens = [...playerTokens];
                          nextTokens[index] = event.target.value;
                          setPlayerTokens(nextTokens);
                        }}
                      >
                        {selectedTheme.tokenCatalog.map((token) => (
                          <option key={token.id} value={token.id}>
                            {token.emoji} {token.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>

              {formError ? <div className="error-text">{formError}</div> : null}
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
            {recentGames.length === 0 ? (
              <div className="empty-state">
                No saved games yet. Create one to get started.
              </div>
            ) : (
              <div className="recent-games">
                {recentGames.map((game) => (
                  <article className="recent-game-item" key={game.id}>
                    <strong>{game.name}</strong>
                    <div className="recent-game-meta">
                      <span>{game.playerCount} players</span>
                      <span>Turn {game.turnNumber}</span>
                      <span>Updated {new Date(game.updatedAt).toLocaleString()}</span>
                    </div>
                    <div className="button-row">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => navigate(`/game/${game.id}`)}
                      >
                        Continue
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => dispatch(removeSavedGame(game.id))}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
