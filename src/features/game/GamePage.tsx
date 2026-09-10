import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { BoardGrid } from '../../components/game/board/BoardGrid';
import { useAnimatedTokenPositions } from '../../components/game/hooks/useAnimatedTokenPositions';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { GameOverlayLayer } from './GameOverlayLayer';
import { useIsRollingDice } from '../../components/game/hooks/useIsRollingDice';
import { useTableState } from '../multiplayer/hooks/useTableState';
import { GameSidebar } from '../../components/game/layout/GameSidebar';
import { selectBoardViewModels } from './boardViewModels.selectors';
import { TOAST_DISMISS_MS } from './game.constants';
import { GameUnavailable } from './GameUnavailable';
import { selectCanEndTurn, selectCanRollDice } from './gameView.selectors';
import { useAppSelector } from '../../app/hooks';
import { ActivityButton } from '../../components/game/overlays/ActivityButton';
import { AppShell } from '../shell/AppShell';
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
  const soundEnabled = useAppSelector((state) => state.ui.soundEnabled);
  // Before the early return, like every other hook here. Falls back to the
  // default edition's id purely so the call is unconditional - nothing renders
  // when there is no game to render.
  // Sounds whatever the last command did. Mounted here because the page is
  // where the game is being played.
  useGameSounds();
  // Held while the dice tumble: the engine has already moved the player by the
  // time the faces start spinning, so without this the token would arrive
  // before the dice showed what sent it there.
  const isRollingDice = useIsRollingDice(activeGame?.turn.lastRollId ?? null);
  const { positions: tokenPositions, isMoving } = useAnimatedTokenPositions(
    players,
    soundEnabled,
    isRollingDice
  );
  // Roll, then move, then outcome - nothing is said until the token arrives.
  useFeedbackGate(isMoving);
  const { viewer, connectionMessage, connectedSeatIds } = useTableState(
    activeGame,
    useAppSelector((state) => state.game.revision)
  );
  const bannerProps = {
    isDismissible: !connectionMessage,
    message: connectionMessage ?? commandError,
    onDismiss: commands.dismissError,
    title: connectionMessage ? 'Waiting for the table' : undefined,
  };

  if (!activeGame) {
    return <GameUnavailable loadError={loadError} />;
  }

  const { findToken, summaries, selectedSummary, ownerMarks, sitePanel, actionRail } =
    selectBoardViewModels(activeGame, theme, overlays, viewer);

  return (
    // is-game is what turns the shell into a fixed app frame on a phone: board
    // pinned at the top, one scrolling region, dice in a bar at the bottom. A
    // modifier class rather than a :has() selector, because only this page wants
    // it and an explicit class is cheaper to read and to assert on.
    <AppShell
      activity={
        <ActivityButton
          eventCount={activeGame.history.length}
          onOpen={overlays.openActivity}
        />
      }
      className="is-game"
      editionId={activeGame.themeId}
    >
      <div className="page">
        {/* data-moving publishes the walk, so a test can assert nothing slipped out mid-way. */}
        <div
          className="game-layout"
          data-moving={isMoving ? 'true' : 'false'}
          data-testid={TEST_IDS.gameLayout}
        >
          <BoardGrid
            board={activeGame.board}
            centerSubtitle={theme.boardCenter.subtitle}
            centerTitle={theme.boardCenter.title}
            currencySymbol={currencySymbol}
            findToken={findToken}
            onSelectSpace={overlays.selectSpace}
            ownerMarks={ownerMarks}
            players={players}
            themeId={activeGame.themeId}
            tokenPositions={tokenPositions}
          />

          <GameSidebar
            bannerProps={bannerProps}
            canEndTurn={selectCanEndTurn(activeGame, viewer)}
            // Not while a token is walking. A double puts the turn straight
            // into AwaitExtraRollOrEnd, so Roll went live mid-walk - and the
            // second roll then restarted the walk from wherever the token had
            // got to, cutting both legs short.
            canRoll={selectCanRollDice(activeGame, viewer) && !isMoving}
            actionRail={actionRail}
            connectedSeatIds={connectedSeatIds}
            currencySymbol={currencySymbol}
            onDismissToast={commands.dismissToast}
            onEndTurn={commands.endTurn}
            onPickAction={overlays.openActionPicker}
            onRoll={commands.rollDice}
            onSelectPlayer={overlays.openPlayer}
            soundEnabled={soundEnabled}
            summaries={summaries}
            toastDismissAfterMs={TOAST_DISMISS_MS}
            toasts={commands.toasts}
            turn={activeGame.turn}
          />
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
          // The asset holder, not the active player: during a liquidation the
          // debtor raises the cash, and a collect-from-each card can bill
          // someone whose turn it is not. See actor.utils.
          sitePanel={sitePanel}
          viewer={viewer}
        />
      </div>
    </AppShell>
  );
}
