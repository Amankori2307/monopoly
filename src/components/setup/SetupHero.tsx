import { Link } from 'react-router-dom';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../domain/constants/game.constants';

/** Intro card on the home screen: what the app is and the locked v1 scope. */
export function SetupHero() {
  return (
    <section className="hero-card">
      <div>
        <h1>Monopoly India Edition</h1>
        <p>
          A typed, resumable rebuild of Monopoly India Edition with local saves, stable
          game ids, and the rules engine separated from the UI.
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
          <strong>
            {MIN_PLAYERS} to {MAX_PLAYERS}
          </strong>
          <span>Persistence</span>
          <strong>LocalStorage</strong>
          <span>Ruleset</span>
          <strong>India Edition</strong>
          <span>Speed Die</span>
          <strong>Planned later</strong>
        </div>
      </div>
    </section>
  );
}
