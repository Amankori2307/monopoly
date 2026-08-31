import { ActivityButton } from '../../components/game/overlays/ActivityButton';
import { ActivityDrawer } from '../../components/game/overlays/ActivityDrawer';
import { DecisionModal } from '../../components/game/overlays/DecisionModal';
import type { SitePanelViewModel } from '../../components/game/overlays/overlays.interfaces';
import { PlayerDetailDrawer } from '../../components/game/overlays/PlayerDetailDrawer';
import { ToastStack } from '../../components/game/overlays/ToastStack';
import type { PlayerSummary } from '../../components/game/panels/panels.interfaces';
import { SpaceDetailCard } from '../../components/game/SpaceDetailCard';
import type { GameState } from '../../domain/types/game.interfaces';
import { TOAST_DISMISS_MS } from './game.constants';
import { selectDecisionViewModel, selectGroupedHoldings } from './gameView.selectors';
import type { UseGameCommandsResult } from './hooks/useGameCommands';
import type { UseGameOverlaysResult } from './hooks/useGameOverlays';

interface GameOverlayLayerProps {
  activeGame: GameState;
  commands: UseGameCommandsResult;
  currencySymbol: string;
  /** True while a token is walking, when a decision must stay hidden. */
  isMoving: boolean;
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
  isMoving,
  overlays,
  selectedSummary,
  sitePanel,
}: GameOverlayLayerProps) {
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
        onProposeTrade={noopUntilTradingLands}
        panel={sitePanel}
      />

      <ToastStack
        dismissAfterMs={TOAST_DISMISS_MS}
        onDismiss={commands.dismissToast}
        toasts={commands.toasts}
      />

      {/* Suppressed while a token walks, so a decision cannot appear before the
          move that caused it has finished. */}
      <DecisionModal
        bidAmount={commands.auctionBidInput}
        currencySymbol={currencySymbol}
        decision={isMoving ? null : selectDecisionViewModel(activeGame)}
        handlers={commands.decisionHandlers}
      />
    </>
  );
}

/** Trading is the next phase; the offer button renders disabled until then. */
function noopUntilTradingLands() {
  return undefined;
}
