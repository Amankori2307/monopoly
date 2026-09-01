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
import { useActiveGame } from './hooks/useActiveGame';
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
  const { positions: tokenPositions, isMoving } = useAnimatedTokenPositions(players);

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
        <div className="game-layout" data-testid={TEST_IDS.gameLayout}>
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
              canEndTurn={selectCanEndTurn(activeGame)}
              canRoll={selectCanRollDice(activeGame)}
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
