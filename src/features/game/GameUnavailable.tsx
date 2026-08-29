import { Link } from 'react-router-dom';

interface GameUnavailableProps {
  loadError: string | null;
}

/** Shown when the route names a game that is missing or fails schema validation. */
export function GameUnavailable({ loadError }: GameUnavailableProps) {
  return (
    <div className="app-shell">
      <div className="page panel">
        <h1>Saved game unavailable</h1>
        <p>{loadError ?? 'This game could not be loaded.'}</p>
        <Link className="primary-button" to="/">
          Back to home
        </Link>
      </div>
    </div>
  );
}
