import './styles/main.scss';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from './features/game/GamePage';
import { RulesPage } from './features/rules/RulesPage';
import { HomePage } from './features/setup/HomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
