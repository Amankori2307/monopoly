import { Link, useParams } from 'react-router-dom';
import { BoardGrid } from '../../components/game/board/BoardGrid';
import { DiceDock } from '../../components/game/DiceDock';
import { ActionRail } from '../../components/game/panels/ActionRail';
import { ActivityPanel } from '../../components/game/panels/ActivityPanel';
import { DecisionPanel } from '../../components/game/panels/decisions/DecisionPanel';
import { HintsPanel } from '../../components/game/panels/HintsPanel';
import { HoldingsPanel } from '../../components/game/panels/HoldingsPanel';
import { PlayersPanel } from '../../components/game/panels/PlayersPanel';
import { TurnPanel } from '../../components/game/panels/TurnPanel';
import { SpaceDetailCard } from '../../components/game/SpaceDetailCard';
import { getPropertyActions } from '../../domain/rules/playerActions.utils';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { BOARD_CENTER_SUBTITLE, BOARD_CENTER_TITLE } from './game.constants';
import { GameUnavailable } from './GameUnavailable';
import { useActiveGame } from './hooks/useActiveGame';
import { useGameCommands } from './hooks/useGameCommands';
import { useSelectedSpace } from './hooks/useSelectedSpace';
import {
  makeTokenFinder,
  selectActivePlayer,
  selectCanEndTurn,
  selectCanRollDice,
  selectDecisionViewModel,
  selectHoldings,
  selectIsJailRoll,
  selectPlayerSummaries,
  selectPlayersByPosition,
} from './gameView.selectors';

/**
 * Wiring only. State comes from hooks, derivations from gameView.selectors, and
 * every pixel from components/game/*.
 */
export function GamePage() {
  const { gameId = '' } = useParams();
  const { activeGame, currencySymbol, loadError, theme, uiHints } = useActiveGame(gameId);
  const commands = useGameCommands();
  const { clearSelection, selectSpace, selectedSpace } = useSelectedSpace(
    activeGame?.board ?? []
  );

  if (!activeGame) {
    return <GameUnavailable loadError={loadError} />;
  }

  const activePlayer = selectActivePlayer(activeGame);
  const findToken = makeTokenFinder(theme);
  const isJailRoll = selectIsJailRoll(activeGame);

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
            onSelectSpace={selectSpace}
            playersByPosition={selectPlayersByPosition(activeGame)}
          />

          <aside className="game-side" data-testid={TEST_IDS.gameSidebar}>
            <TurnPanel
              canEndTurn={selectCanEndTurn(activeGame)}
              canRollAgain={activeGame.turn.canRollAgain}
              locationName={activeGame.board[activePlayer.position].name}
              onEndTurn={commands.endTurn}
              playerName={activePlayer.name}
              tokenEmoji={
                findToken(activePlayer.tokenId)?.emoji ?? activePlayer.name.charAt(0)
              }
              turnNumber={activeGame.turnNumber}
            />

            <div className="button-row">
              <Link className="secondary-button" to="/">
                Home
              </Link>
              <Link className="secondary-button" to="/rules">
                Rules
              </Link>
            </div>

            <DecisionPanel
              bidAmount={commands.auctionBidInput}
              currencySymbol={currencySymbol}
              decision={selectDecisionViewModel(activeGame)}
              handlers={commands.decisionHandlers}
            />

            <HintsPanel hints={uiHints} />

            <PlayersPanel
              activePlayerId={activePlayer.id}
              currencySymbol={currencySymbol}
              summaries={selectPlayerSummaries(activeGame, theme)}
            />

            <HoldingsPanel
              holdings={selectHoldings(activeGame, activePlayer.id)}
              ownerName={activePlayer.name}
            />

            <ActivityPanel events={activeGame.history} />
          </aside>
        </div>

        <DiceDock
          canRoll={selectCanRollDice(activeGame)}
          lastRoll={activeGame.turn.lastRoll}
          onRoll={() => commands.rollDice(isJailRoll)}
          rollLabel={isJailRoll ? 'Roll for doubles' : 'Roll dice'}
        />

        <SpaceDetailCard
          currencySymbol={currencySymbol}
          onClose={clearSelection}
          space={selectedSpace}
        />
      </div>
    </div>
  );
}

/** Placeholder until property actions can supply a target space. */
function noopUntilPropertyPickerExists() {
  return undefined;
}
