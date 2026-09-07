import { getExpectedActorId } from '../../domain/rules/actor.utils';
import { PendingDecisionType } from '../../domain/types/game.enums';
import type { GameState, PlayerId } from '../../domain/types/game.interfaces';
import { DecisionAudience } from './decisionAudience.enums';

/**
 * Who each decision is for.
 *
 * A row per decision type, guarded by a test, for the reason the sound cues are:
 * a new decision that nobody has thought about must not quietly default to
 * something. The default that would have been chosen here - "the owner answers"
 * - is wrong for game over, where there is no owner and everybody needs the
 * button.
 */
export const AUDIENCE_FOR_DECISION: Record<PendingDecisionType, DecisionAudience> = {
  [PendingDecisionType.None]: DecisionAudience.Owner,
  [PendingDecisionType.LandedUnownedProperty]: DecisionAudience.Owner,
  [PendingDecisionType.AuctionBid]: DecisionAudience.Owner,
  [PendingDecisionType.JailChoice]: DecisionAudience.Owner,
  [PendingDecisionType.CardDraw]: DecisionAudience.Owner,
  [PendingDecisionType.AssetLiquidation]: DecisionAudience.Owner,
  [PendingDecisionType.BuildingPlacement]: DecisionAudience.Owner,
  [PendingDecisionType.TradeResponse]: DecisionAudience.Owner,
  [PendingDecisionType.BankruptcyResolution]: DecisionAudience.Owner,
  [PendingDecisionType.SpeedDieBus]: DecisionAudience.Owner,
  [PendingDecisionType.SpeedDieDestination]: DecisionAudience.Owner,
  // The game is over. There is nothing left to take a turn with, and the panel
  // is how anyone gets back to the home page.
  [PendingDecisionType.GameOver]: DecisionAudience.Everyone,
};

/**
 * Who must answer the decision currently on screen.
 *
 * `getExpectedActorId`, not `decisionOwnerOf`, and the difference is
 * load-bearing: the Jail panel is derived from `player.inJail` rather than from
 * `pendingDecision`, so it appears while nothing is pending at all.
 * `decisionOwnerOf` correctly reports "no decision owner" for that, which would
 * have shown a jailed player an inert copy of their own only move.
 */
export const decisionActorId = (game: GameState): PlayerId | null =>
  getExpectedActorId(game);

/** Whether this decision is one seat's to answer, or the whole table's. */
export const decisionAudienceOf = (game: GameState): DecisionAudience =>
  AUDIENCE_FOR_DECISION[game.pendingDecision.type];
