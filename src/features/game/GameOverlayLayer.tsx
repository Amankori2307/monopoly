import { ActivityDrawer } from '../../components/game/overlays/ActivityDrawer';
import { DecisionModal } from '../../components/game/overlays/DecisionModal';
import { DecisionSpectatorLayer } from '../../components/game/overlays/DecisionSpectatorLayer';
import { DecisionAudience } from './decisionAudience.enums';
import { decisionActorId, decisionAudienceOf } from './decisionAudience';
import type { Viewer } from '../multiplayer/viewer.interfaces';
import { viewerControls } from '../multiplayer/viewer.utils';
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
  /** Who is at this screen - the hot seat, one seat, or a spectator. */
  viewer: Viewer;
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
  viewer,
  soundEnabled,
}: GameOverlayLayerProps) {
  const tradeBuilder = overlays.tradeTargetPlayerId
    ? selectTradeBuilder(activeGame, findToken, overlays.tradeTargetPlayerId)
    : null;

  // One decision, two presentations. Resolved here rather than in either
  // component so the owner and the table cannot end up looking at different
  // states of the same game.
  const decision = isMoving ? null : selectDecisionViewModel(activeGame, findToken);
  const decisionOwnerId = decisionActorId(activeGame);
  // Game over belongs to the whole table - there is no owner, and the panel is
  // how anybody gets back to the home page. Everything else is one seat's.
  const isOwner =
    decisionAudienceOf(activeGame) === DecisionAudience.Everyone ||
    viewerControls(viewer, decisionOwnerId);
  const ownerName = decisionOwnerId
    ? (activeGame.players[decisionOwnerId]?.name ?? null)
    : null;

  return (
    <>
      {/* The activity BUTTON is rendered by GameSidebar, in the turn-control
          row: floating bottom-left, it sat exactly on top of that row on a
          phone. Only the drawer is an overlay. */}
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
          move that caused it has finished.

          Everyone sees the decision; only its owner can answer it. The owner
          gets the modal, unchanged and still non-dismissible - the turn cannot
          advance until they answer, so an escape hatch would only strand them.
          Everyone else gets the same panel, inert. */}
      {isOwner ? (
        <DecisionModal
          bidField={commands.bidField}
          soundEnabled={soundEnabled}
          currencySymbol={currencySymbol}
          decision={decision}
          handlers={commands.decisionHandlers}
        />
      ) : (
        <DecisionSpectatorLayer
          bidField={commands.bidField}
          soundEnabled={soundEnabled}
          currencySymbol={currencySymbol}
          decision={decision}
          handlers={commands.decisionHandlers}
          ownerName={ownerName}
        />
      )}
    </>
  );
}
