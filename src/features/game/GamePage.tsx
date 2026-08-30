import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BoardGrid } from '../../components/game/board/BoardGrid';
import { useAnimatedTokenPositions } from '../../components/game/hooks/useAnimatedTokenPositions';
import { ActivityButton } from '../../components/game/overlays/ActivityButton';
import { ActivityDrawer } from '../../components/game/overlays/ActivityDrawer';
import { DecisionModal } from '../../components/game/overlays/DecisionModal';
import { PlayerDetailDrawer } from '../../components/game/overlays/PlayerDetailDrawer';
import { ActionRail } from '../../components/game/panels/ActionRail';
import { CommandErrorBanner } from '../../components/game/panels/CommandErrorBanner';
import { HintsPanel } from '../../components/game/panels/HintsPanel';
import { PlayersPanel } from '../../components/game/panels/PlayersPanel';
import { TurnControls } from '../../components/game/panels/TurnControls';
import { SpaceDetailCard } from '../../components/game/SpaceDetailCard';
import { getPropertyActions } from '../../domain/rules/playerActions.utils';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { BOARD_CENTER_SUBTITLE, BOARD_CENTER_TITLE } from './game.constants';
import { GameUnavailable } from './GameUnavailable';
import {
  makeTokenFinder,
  selectActivePlayer,
  selectCanEndTurn,
  selectCanRollDice,
  selectDecisionViewModel,
  selectGroupedHoldings,
  selectIsJailRoll,
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
  const { activeGame, commandError, currencySymbol, loadError, theme, uiHints } =
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
  const isJailRoll = selectIsJailRoll(activeGame);
  const summaries = selectPlayerSummaries(activeGame, theme);
  const selectedSummary =
    summaries.find((summary) => summary.player.id === overlays.selectedPlayerId) ?? null;
  const selectedSpace =
    activeGame.board.find((space) => space.id === overlays.selectedSpaceId) ?? null;

  return (
    <div className="app-shell" data-theme={activeGame.themeId}>
      <div className="page">
        <div className="game-layout" data-testid={TEST_IDS.gameLayout}>
          {/*
            Every property action is disabled while its engine command is
            scaffolded, so onAction cannot fire yet. Wiring it needs a property
            picker to supply spaceId - see docs/features/game-turn.md.
          */}
          <ActionRail
            actions={getPropertyActions(activeGame, activePlayer.id)}
            onAction={noopUntilPropertyPickerExists}
          />

          <BoardGrid
            board={activeGame.board}
            centerSubtitle={BOARD_CENTER_SUBTITLE}
            centerTitle={BOARD_CENTER_TITLE}
            findToken={findToken}
            onSelectSpace={overlays.selectSpace}
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

              <HintsPanel hints={uiHints} />
              <div className="button-row">
                <Link className="secondary-button" to="/">
                  Home
                </Link>
                <Link className="secondary-button" to="/rules">
                  Rules
                </Link>
              </div>
            </div>

            <TurnControls
              canEndTurn={selectCanEndTurn(activeGame)}
              canRoll={selectCanRollDice(activeGame)}
              canRollAgain={activeGame.turn.canRollAgain}
              lastRoll={activeGame.turn.lastRoll}
              onEndTurn={commands.endTurn}
              onRoll={() => commands.rollDice(isJailRoll)}
              rollLabel={isJailRoll ? 'Roll for doubles' : 'Roll dice'}
            />
          </aside>
        </div>

        <ActivityButton
          eventCount={activeGame.history.length}
          onOpen={overlays.openActivity}
        />

        <ActivityDrawer
          events={activeGame.history}
          isOpen={overlays.isActivityOpen}
          onClose={overlays.closeActivity}
        />

        <PlayerDetailDrawer
          currencySymbol={currencySymbol}
          sections={
            selectedSummary
              ? selectGroupedHoldings(activeGame, selectedSummary.player.id)
              : []
          }
          onClose={overlays.closePlayer}
          summary={selectedSummary}
        />

        <SpaceDetailCard
          currencySymbol={currencySymbol}
          onClose={overlays.clearSpace}
          space={selectedSpace}
        />

        <DecisionModal
          bidAmount={commands.auctionBidInput}
          currencySymbol={currencySymbol}
          decision={isMoving ? null : selectDecisionViewModel(activeGame)}
          handlers={commands.decisionHandlers}
        />
      </div>
    </div>
  );
}

/** Placeholder until property actions can supply a target space. */
function noopUntilPropertyPickerExists() {
  return undefined;
}
