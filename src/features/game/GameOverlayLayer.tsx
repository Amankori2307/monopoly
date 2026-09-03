import { ActivityButton } from '../../components/game/overlays/ActivityButton';
import { ActivityDrawer } from '../../components/game/overlays/ActivityDrawer';
import { DecisionModal } from '../../components/game/overlays/DecisionModal';
import type { SitePanelViewModel } from '../../components/game/overlays/overlays.interfaces';
import { PlayerDetailDrawer } from '../../components/game/overlays/PlayerDetailDrawer';
import type { PlayerSummary } from '../../components/game/panels/panels.interfaces';
import { SpaceDetailCard } from '../../components/game/SpaceDetailCard';
import { TradeBuilder } from '../../components/game/trade/TradeBuilder';
import type { GameState, ThemeToken } from '../../domain/types/game.interfaces';
import {
  selectDecisionViewModel,
  selectGroupedHoldings,
  selectTradeBuilder,
} from './gameView.selectors';
import type { UseGameCommandsResult } from './hooks/useGameCommands';
import type { UseGameOverlaysResult } from './hooks/useGameOverlays';

interface GameOverlayLayerProps {
  activeGame: GameState;
  commands: UseGameCommandsResult;
  currencySymbol: string;
  /** Token lookup, so each side of a trade wears its player's colour. */
  findToken: (tokenId: string) => ThemeToken | undefined;
  /** True while a token is walking, when a decision must stay hidden. */
  isMoving: boolean;
  /** False when the player has muted the game - the Jail panel rolls dice. */
  soundEnabled: boolean;
  overlays: UseGameOverlaysResult;
  selectedSummary: PlayerSummary | null;
  sitePanel: SitePanelViewModel;
}

/**
 * Everything that floats over the board: drawers, the deed panel, toasts, and
 * the decision modal.
 *
 * Split out of GamePage because the page had grown past the point where the
 * board layout and the overlay stack read as one thing. Nothing here is
 * conditional on layout - it all renders over the top.
 */
export function GameOverlayLayer({
  activeGame,
  commands,
  currencySymbol,
  findToken,
  isMoving,
  overlays,
  selectedSummary,
  sitePanel,
  soundEnabled,
}: GameOverlayLayerProps) {
  const tradeBuilder = overlays.tradeTargetPlayerId
    ? selectTradeBuilder(activeGame, findToken, overlays.tradeTargetPlayerId)
    : null;

  return (
    <>
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
        onClose={overlays.closePlayer}
        ownership={activeGame.ownership}
        sections={
          selectedSummary
            ? selectGroupedHoldings(activeGame, selectedSummary.player.id)
            : []
        }
        summary={selectedSummary}
      />

      <SpaceDetailCard
        currencySymbol={currencySymbol}
        onClose={overlays.clearSpace}
        onPropertyAction={commands.runPropertyCommand}
        // A deal is with the site's owner, so the panel's spaceId is the way in.
        onProposeTrade={(spaceId) => {
          const ownerId = activeGame.ownership[spaceId]?.ownerPlayerId;
          if (ownerId) {
            overlays.openTrade(ownerId);
          }
        }}
        panel={sitePanel}
      />

      {/* Unlike a decision modal this one IS dismissible: an offer nobody has
          sent yet is not a decision anyone is waiting on. */}
      {tradeBuilder ? (
        <div
          className="trade-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              overlays.closeTrade();
            }
          }}
          role="presentation"
        >
          <div aria-modal="true" className="trade-modal" role="dialog">
            <TradeBuilder
              builder={tradeBuilder}
              currencySymbol={currencySymbol}
              onCancel={overlays.closeTrade}
              onPropose={(trade) => {
                commands.proposeTrade(trade);
                overlays.closeTrade();
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Suppressed while a token walks, so a decision cannot appear before the
          move that caused it has finished. */}
      <DecisionModal
        bidField={commands.bidField}
        soundEnabled={soundEnabled}
        currencySymbol={currencySymbol}
        decision={isMoving ? null : selectDecisionViewModel(activeGame, findToken)}
        handlers={commands.decisionHandlers}
      />
    </>
  );
}
