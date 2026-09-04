import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BoardGrid } from '../../components/game/board/BoardGrid';
import { useAnimatedTokenPositions } from '../../components/game/hooks/useAnimatedTokenPositions';
import { CommandErrorBanner } from '../../components/game/panels/CommandErrorBanner';
import { ToastStack } from '../../components/game/overlays/ToastStack';
import { PlayersPanel } from '../../components/game/panels/PlayersPanel';
import { TurnControls } from '../../components/game/panels/TurnControls';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { selectSpaceOwnerMarks } from './boardOwnership.utils';
import { GameOverlayLayer } from './GameOverlayLayer';
import { selectSitePanel } from './sitePanel.utils';
import {
  BOARD_CENTER_SUBTITLE,
  BOARD_CENTER_TITLE,
  TOAST_DISMISS_MS,
} from './game.constants';
import { GameUnavailable } from './GameUnavailable';
import {
  makeTokenFinder,
  selectActivePlayer,
  selectCanEndTurn,
  selectCanRollDice,
  selectPlayerSummaries,
} from './gameView.selectors';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setSoundEnabled } from './uiSlice';
import { useActiveGame } from './hooks/useActiveGame';
import { useFeedbackGate } from './hooks/useFeedbackGate';
import { useGameSounds } from './hooks/useGameSounds';
import { useGameCommands } from './hooks/useGameCommands';
import { useGameOverlays } from './hooks/useGameOverlays';

/**
 * Wiring only.
 *
 * The main screen is kept to the board, the player stack, and the turn controls.
 * Everything else - the pending decision, a player's holdings, the activity log -
 * lives in an overlay so the board stays uncluttered.
 */
export function GamePage() {
  const { gameId = '' } = useParams();
  const { activeGame, commandError, currencySymbol, loadError, theme } =
    useActiveGame(gameId);
  const commands = useGameCommands();
  const overlays = useGameOverlays();
  // Hooks must run before any early return, so this is computed unconditionally.
  const players = useMemo(
    () => activeGame?.playerOrder.map((id) => activeGame.players[id]) ?? [],
    [activeGame]
  );
  // Display positions lag the engine while a token walks to its new space.
  const dispatch = useAppDispatch();
  const soundEnabled = useAppSelector((state) => state.ui.soundEnabled);
  // Sounds whatever the last command did. Mounted here because the page is
  // where the game is being played.
  useGameSounds();
  const { positions: tokenPositions, isMoving } = useAnimatedTokenPositions(
    players,
    soundEnabled
  );
  // Roll, then move, then outcome - nothing is said until the token arrives.
  useFeedbackGate(isMoving);

  if (!activeGame) {
    return <GameUnavailable loadError={loadError} />;
  }

  const activePlayer = selectActivePlayer(activeGame);
  const findToken = makeTokenFinder(theme);
  const summaries = selectPlayerSummaries(activeGame, theme);
  const selectedSummary =
    summaries.find((summary) => summary.player.id === overlays.selectedPlayerId) ?? null;
  const selectedSpace =
    activeGame.board.find((space) => space.id === overlays.selectedSpaceId) ?? null;
  const ownerMarks = selectSpaceOwnerMarks(activeGame, findToken);

  return (
    <div className="app-shell" data-theme={activeGame.themeId}>
      <div className="page">
        {/* data-moving publishes the walk, so a test can assert nothing slipped out mid-way. */}
        <div
          className="game-layout"
          data-moving={isMoving ? 'true' : 'false'}
          data-testid={TEST_IDS.gameLayout}
        >
          <BoardGrid
            board={activeGame.board}
            centerSubtitle={BOARD_CENTER_SUBTITLE}
            centerTitle={BOARD_CENTER_TITLE}
            findToken={findToken}
            onSelectSpace={overlays.selectSpace}
            ownerMarks={ownerMarks}
            players={players}
            tokenPositions={tokenPositions}
          />

          <aside className="game-side" data-testid={TEST_IDS.gameSidebar}>
            <PlayersPanel
              currencySymbol={currencySymbol}
              onSelectPlayer={overlays.openPlayer}
              summaries={summaries}
            />

            <div className="game-side-scroll">
              <CommandErrorBanner
                message={commandError}
                onDismiss={commands.dismissError}
              />

              <div className="button-row">
                <Link className="secondary-button" to="/">
                  Home
                </Link>
                <Link className="secondary-button" to="/rules">
                  Rules
                </Link>
                {/* Beside the other two rather than tucked away: nine sounds
                    need an off switch a player can find. */}
                <button
                  aria-pressed={!soundEnabled}
                  className="secondary-button"
                  data-testid={TEST_IDS.soundToggle}
                  onClick={() => dispatch(setSoundEnabled(!soundEnabled))}
                  title={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
                  type="button"
                >
                  {soundEnabled ? '🔊 Sound' : '🔇 Muted'}
                </button>
              </div>
            </div>

            {/*
              In the sidebar's own flow, immediately above the dice. Floating it
              over the board meant it always covered something - first the dice
              themselves, then the deed card and the board's left column. Here it
              occupies space nothing else wants.
            */}
            <ToastStack
              dismissAfterMs={TOAST_DISMISS_MS}
              onDismiss={commands.dismissToast}
              toasts={commands.toasts}
            />

            <TurnControls
              soundEnabled={soundEnabled}
              canEndTurn={selectCanEndTurn(activeGame)}
              // Not while a token is walking. A double puts the turn straight
              // into AwaitExtraRollOrEnd, so Roll went live mid-walk - and the
              // second roll then restarted the walk from wherever the token had
              // got to, cutting both legs short.
              canRoll={selectCanRollDice(activeGame) && !isMoving}
              canRollAgain={activeGame.turn.canRollAgain}
              speedDieFace={activeGame.turn.speedDieFace}
              lastRoll={activeGame.turn.lastRoll}
              onEndTurn={commands.endTurn}
              onRoll={commands.rollDice}
              rollLabel="Roll dice"
            />
          </aside>
        </div>

        <GameOverlayLayer
          activeGame={activeGame}
          commands={commands}
          currencySymbol={currencySymbol}
          findToken={findToken}
          overlays={overlays}
          selectedSummary={selectedSummary}
          isMoving={isMoving}
          soundEnabled={soundEnabled}
          sitePanel={selectSitePanel(
            activeGame,
            activePlayer.id,
            selectedSpace,
            ownerMarks
          )}
        />
      </div>
    </div>
  );
}
