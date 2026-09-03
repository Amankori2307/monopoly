import { PendingDecisionType } from '../../../../domain/types/game.enums';
import type {
  AuctionDecisionViewModel,
  BidFieldState,
  DecisionHandlers,
  DecisionViewModel,
} from '../panels.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { AuctionDecision } from './AuctionDecision';
import { BuildingPlacementDecision } from './BuildingPlacementDecision';
import { BuyOrAuctionDecision } from './BuyOrAuctionDecision';
import { CardDrawDecision } from './CardDrawDecision';
import { GameOverDecision } from './GameOverDecision';
import { JailDecision } from './JailDecision';
import { LiquidationDecision } from './LiquidationDecision';
import { SpeedDieBusDecision } from './SpeedDieBusDecision';
import { SpeedDieDestinationDecision } from './SpeedDieDestinationDecision';
import { TradeResponseDecision } from './TradeResponseDecision';

interface DecisionPanelProps {
  /** Null unless an auction is open; the auction branch is the only reader. */
  bidField: BidFieldState | null;
  /** False when the player has muted the game - the Jail panel rolls dice. */
  soundEnabled: boolean;
  currencySymbol: string;
  decision: DecisionViewModel | null;
  handlers: DecisionHandlers;
}

/**
 * The auction branch, pulled out so this file's own branching stays inside the
 * complexity limit - and because it is the one case with a second condition:
 * the bid field arrives separately, from the ui slice rather than the game.
 */
const auctionPanel = (
  decision: AuctionDecisionViewModel,
  bidField: BidFieldState | null,
  currencySymbol: string,
  handlers: DecisionHandlers
) =>
  bidField ? (
    <AuctionDecision
      activeBidder={decision.activeBidder}
      bidField={bidField}
      buildingKind={decision.buildingKind}
      currencySymbol={currencySymbol}
      ledger={decision.ledger}
      onBid={handlers.onBid}
      onBidAmountChange={handlers.onBidAmountChange}
      onPass={handlers.onPass}
      space={decision.space}
    />
  ) : null;

/**
 * Renders whichever decision is pending.
 *
 * Adding a PendingDecisionType means adding a case here as well as a view model
 * in gameView.selectors - otherwise the game stalls with no way to advance.
 */
export function DecisionPanel({
  bidField,
  currencySymbol,
  decision,
  handlers,
  soundEnabled,
}: DecisionPanelProps) {
  if (!decision) {
    return null;
  }

  return (
    <section className="decision-card" data-testid={TEST_IDS.decisionPanel}>
      {decision.type === PendingDecisionType.LandedUnownedProperty ? (
        <BuyOrAuctionDecision
          currencySymbol={currencySymbol}
          onBuy={handlers.onBuy}
          onDecline={handlers.onDecline}
          playerName={decision.playerName}
          space={decision.space}
        />
      ) : null}

      {decision.type === PendingDecisionType.AuctionBid
        ? auctionPanel(decision, bidField, currencySymbol, handlers)
        : null}

      {decision.type === PendingDecisionType.JailChoice ? (
        <JailDecision
          attemptsUsed={decision.attemptsUsed}
          canUseJailCard={decision.canUseJailCard}
          currencySymbol={currencySymbol}
          lastRoll={decision.lastRoll}
          onAttemptJailRoll={handlers.onAttemptJailRoll}
          onPayFine={handlers.onPayJailFine}
          onUseJailCard={handlers.onUseJailCard}
          playerName={decision.playerName}
          soundEnabled={soundEnabled}
        />
      ) : null}

      {decision.type === PendingDecisionType.CardDraw ? (
        <CardDrawDecision
          cardDescription={decision.cardDescription}
          cardTitle={decision.cardTitle}
          deckLabel={decision.deckLabel}
          onAcknowledge={handlers.onAcknowledgeCard}
          playerName={decision.playerName}
        />
      ) : null}

      {decision.type === PendingDecisionType.TradeResponse ? (
        <TradeResponseDecision
          currencySymbol={currencySymbol}
          incoming={decision.incoming}
          incomingMortgaged={decision.incomingMortgaged}
          onAccept={handlers.onAcceptTrade}
          onReject={handlers.onRejectTrade}
          outgoing={decision.outgoing}
          recipientName={decision.recipientName}
        />
      ) : null}

      {decision.type === PendingDecisionType.SpeedDieBus ? (
        <SpeedDieBusDecision
          onChoose={handlers.onChooseBusMove}
          playerName={decision.playerName}
          whiteDice={decision.whiteDice}
        />
      ) : null}

      {decision.type === PendingDecisionType.SpeedDieDestination ? (
        <SpeedDieDestinationDecision
          board={decision.board}
          onChoose={handlers.onChooseDestination}
          playerName={decision.playerName}
        />
      ) : null}

      {decision.type === PendingDecisionType.BuildingPlacement ? (
        <BuildingPlacementDecision
          buildingKind={decision.buildingKind}
          currencySymbol={currencySymbol}
          onChoose={handlers.onChooseBuildingSite}
          paidAmount={decision.paidAmount}
          playerName={decision.playerName}
          sites={decision.sites}
        />
      ) : null}

      {decision.type === PendingDecisionType.GameOver ? (
        <GameOverDecision winnerName={decision.winnerName} />
      ) : null}

      {decision.type === PendingDecisionType.AssetLiquidation ? (
        <LiquidationDecision
          amountDue={decision.amountDue}
          canSettle={decision.canSettle}
          creditorName={decision.creditorName}
          currencySymbol={currencySymbol}
          isBankrupt={decision.isBankrupt}
          mortgageableSites={decision.mortgageableSites}
          onDeclareBankruptcy={handlers.onDeclareBankruptcy}
          onMortgageSite={handlers.onMortgageSite}
          onSellBuilding={handlers.onSellBuilding}
          onSettleDebt={handlers.onSettleDebt}
          playerName={decision.playerName}
          queuedDebtCount={decision.queuedDebtCount}
          reason={decision.reason}
          sellableBuildings={decision.sellableBuildings}
        />
      ) : null}
    </section>
  );
}
