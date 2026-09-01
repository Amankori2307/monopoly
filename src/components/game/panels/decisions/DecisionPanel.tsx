import { PendingDecisionType } from '../../../../domain/types/game.enums';
import type { DecisionHandlers, DecisionViewModel } from '../panels.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { AuctionDecision } from './AuctionDecision';
import { BuyOrAuctionDecision } from './BuyOrAuctionDecision';
import { CardDrawDecision } from './CardDrawDecision';
import { GameOverDecision } from './GameOverDecision';
import { JailDecision } from './JailDecision';
import { LiquidationDecision } from './LiquidationDecision';
import { SpeedDieBusDecision } from './SpeedDieBusDecision';
import { SpeedDieDestinationDecision } from './SpeedDieDestinationDecision';
import { TradeResponseDecision } from './TradeResponseDecision';

interface DecisionPanelProps {
  bidAmount: number;
  currencySymbol: string;
  decision: DecisionViewModel | null;
  handlers: DecisionHandlers;
}

/**
 * Renders whichever decision is pending.
 *
 * Adding a PendingDecisionType means adding a case here as well as a view model
 * in gameView.selectors - otherwise the game stalls with no way to advance.
 */
export function DecisionPanel({
  bidAmount,
  currencySymbol,
  decision,
  handlers,
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

      {decision.type === PendingDecisionType.AuctionBid ? (
        <AuctionDecision
          activeBidderName={decision.activeBidderName}
          bidAmount={bidAmount}
          currencySymbol={currencySymbol}
          highestBid={decision.highestBid}
          minimumBid={decision.minimumBid}
          onBid={handlers.onBid}
          onBidAmountChange={handlers.onBidAmountChange}
          onPass={handlers.onPass}
          spaceName={decision.spaceName}
        />
      ) : null}

      {decision.type === PendingDecisionType.JailChoice ? (
        <JailDecision
          canUseJailCard={decision.canUseJailCard}
          currencySymbol={currencySymbol}
          onPayFine={handlers.onPayJailFine}
          onUseJailCard={handlers.onUseJailCard}
          playerName={decision.playerName}
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
