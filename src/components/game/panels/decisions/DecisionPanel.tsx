import { PendingDecisionType } from '../../../../domain/types/game.enums';
import type { DecisionHandlers, DecisionViewModel } from '../panels.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { AuctionDecision } from './AuctionDecision';
import { BuyOrAuctionDecision } from './BuyOrAuctionDecision';
import { JailDecision } from './JailDecision';
import { LiquidationDecision } from './LiquidationDecision';

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
          price={decision.price}
          spaceName={decision.spaceName}
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

      {decision.type === PendingDecisionType.AssetLiquidation ? (
        <LiquidationDecision
          amountDue={decision.amountDue}
          currencySymbol={currencySymbol}
          playerName={decision.playerName}
        />
      ) : null}
    </section>
  );
}
