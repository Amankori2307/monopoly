import type { DeckName, PendingDecisionType } from './game.enums';
import type { AuctionId, DeckCard, PlayerId, SpaceId } from './game.interfaces';

/**
 * What the game is waiting on, if anything.
 *
 * Split out of game.interfaces.ts, which the Speed Die's two decisions pushed
 * past its line limit. A new decision type still needs its five edits - see
 * CLAUDE.md section 4 - this only changes where the shape itself lives.
 */

export interface PendingDecisionNone {
  type: PendingDecisionType.None;
}

export interface PendingDecisionProperty {
  type: PendingDecisionType.LandedUnownedProperty;
  spaceId: SpaceId;
  playerId: PlayerId;
}

export interface PendingDecisionAuction {
  type: PendingDecisionType.AuctionBid;
  auctionId: AuctionId;
}

export interface PendingDecisionJail {
  type: PendingDecisionType.JailChoice;
  playerId: PlayerId;
}

/**
 * A drawn Chance or Community Chest card, waiting to be acknowledged. The card
 * rides inside the decision rather than in a field of its own on GameState:
 * schema.ts validates pendingDecision with `.passthrough()`, so it survives a
 * save/load round trip, whereas a new top-level field would be silently
 * stripped by the surrounding `z.object`.
 */
export interface PendingDecisionCardDraw {
  type: PendingDecisionType.CardDraw;
  playerId: PlayerId;
  deck: DeckName;
  card: DeckCard;
}

/** One debt somebody owes and cannot currently pay. */
export interface DebtRecord {
  playerId: PlayerId;
  amountDue: number;
  creditorPlayerId: PlayerId | null;
  reason: string;
}

export interface PendingDecisionAssetLiquidation extends DebtRecord {
  type: PendingDecisionType.AssetLiquidation;
  /**
   * Debts waiting behind this one - one card can leave several players unable
   * to pay, and only one decision can be pending at a time.
   *
   * It rides inside the decision rather than in a field of its own because
   * `pendingDecision` is the one part of a save validated with `.passthrough()`;
   * a new top-level GameState field would be silently stripped on load.
   */
  queued: DebtRecord[];
}

export interface PendingDecisionTrade {
  type: PendingDecisionType.TradeResponse;
  proposerPlayerId: PlayerId;
  recipientPlayerId: PlayerId;
}

export interface PendingDecisionBankruptcy {
  type: PendingDecisionType.BankruptcyResolution;
  playerId: PlayerId;
}

export interface PendingDecisionSpeedDieBus {
  type: PendingDecisionType.SpeedDieBus;
  playerId: PlayerId;
  /** The two white dice, which are the only values the player may pick from. */
  whiteDice: [number, number];
}

export interface PendingDecisionSpeedDieDestination {
  type: PendingDecisionType.SpeedDieDestination;
  playerId: PlayerId;
}

export interface PendingDecisionGameOver {
  type: PendingDecisionType.GameOver;
}

export type PendingDecision =
  | PendingDecisionNone
  | PendingDecisionProperty
  | PendingDecisionAuction
  | PendingDecisionJail
  | PendingDecisionCardDraw
  | PendingDecisionAssetLiquidation
  | PendingDecisionTrade
  | PendingDecisionBankruptcy
  | PendingDecisionSpeedDieBus
  | PendingDecisionSpeedDieDestination
  | PendingDecisionGameOver;
