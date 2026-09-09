import './styles/main.scss';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from './features/game/GamePage';
import { RulesPage } from './features/rules/RulesPage';
import { ChooserPage } from './features/setup/ChooserPage';
import { NewGamePage } from './features/setup/NewGamePage';
import { HostPage } from './features/multiplayer/HostPage';
import { JoinPage } from './features/multiplayer/JoinPage';
import { LobbyPage } from './features/lobby/LobbyPage';
import { NotFoundPage } from './features/shell/NotFoundPage';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* HashRouter, not BrowserRouter. GitHub Pages is a plain static host:
          it serves a file or it 404s, so `/monopoly/rules` - a path with no
          file behind it - was a hard 404 on refresh and on any shared link.

          The usual dodge is a `404.html` that redirects into the app, but a
          link someone pastes into a chat app is unfurled by a bot that sees
          the 404 status and gives up before the redirect runs. A game invite
          IS a pasted link, so no preview card is the wrong trade. It also
          hardcodes the `/monopoly/` base a second time, in a file no build
          step ever validates.

          Everything after the `#` never reaches the server, so every route
          resolves to index.html by construction. */}
      <HashRouter>
        <Routes>
          {/* The front door asks how you want to play; each answer gets a
              screen carrying only what belongs to it. */}
          <Route path="/" element={<ChooserPage />} />
          <Route path="/new" element={<NewGamePage />} />
          <Route path="/host" element={<HostPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          {/* The invite link. The same URL after the game starts sends the
              follower into the game rather than a lobby that is gone. */}
          <Route path="/lobby/:gameId" element={<LobbyPage />} />
          {/* Without this an unmatched hash renders nothing at all. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
