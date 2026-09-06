import { GameCommandType, PendingDecisionType } from '../types/game.enums';
import type { PendingDecision } from '../types/decisions.interfaces';
import type {
  GameState,
  PlayerId,
  PlayerState,
  RuntimeGameCommand,
} from '../types/game.interfaces';
import { getActivePlayer, getPlayerById } from './engine/state.utils';

/**
 * Who may act, and on whose behalf.
 *
 * Every command handler in the engine derives its actor from the state - the
 * active player, or the auction's current bidder - and never from the caller.
 * In one browser that is correct by construction: the only person who can
 * click is the person sitting there. The moment a command can arrive from
 * another device it stops being true, and this is the predicate that makes the
 * caller's identity checkable.
 *
 * It is not only a network concern. Deriving the actor from `getActivePlayer`
 * is what made a non-active player's liquidation unresolvable: a
 * `collect-from-each` card can leave someone who is not the active player owing
 * money they cannot pay, and mortgaging - the documented way out - acted on the
 * active player instead, so the debtor was told they did not own their own
 * site. See `getAssetHolderId`.
 */

/**
 * One resolver per decision type, so a new type is a compile error here rather
 * than a silent default to the active player - which is the wrong answer for
 * two of the twelve. A `switch` said the same thing but counted twelve
 * branches against the complexity limit; this counts one, and the Record over
 * the union's own `type` is a stronger guarantee than an `exhaustive: never`.
 */
type DecisionOwnerResolvers = {
  [K in PendingDecision['type']]: (
    decision: Extract<PendingDecision, { type: K }>,
    state: GameState
  ) => PlayerId | null;
};

const OWNER_OF: DecisionOwnerResolvers = {
  [PendingDecisionType.None]: () => null,
  [PendingDecisionType.GameOver]: () => null,

  [PendingDecisionType.AuctionBid]: (decision, state) => {
    const auction = state.auctionState;
    // Matching on "there is an auction" rather than on its id would hand the
    // controls to the previous lot's bidder when a queued bankruptcy auction
    // has replaced its predecessor.
    if (!auction || auction.id !== decision.auctionId) {
      return null;
    }
    return auction.activeBidderOrder[auction.activeBidderIndex] ?? null;
  },

  // The recipient answers a trade, and they are never the proposer - who is
  // the active player.
  [PendingDecisionType.TradeResponse]: (decision) => decision.recipientPlayerId,

  [PendingDecisionType.LandedUnownedProperty]: (decision) => decision.playerId,
  [PendingDecisionType.JailChoice]: (decision) => decision.playerId,
  [PendingDecisionType.CardDraw]: (decision) => decision.playerId,
  [PendingDecisionType.AssetLiquidation]: (decision) => decision.playerId,
  [PendingDecisionType.BankruptcyResolution]: (decision) => decision.playerId,
  [PendingDecisionType.SpeedDieBus]: (decision) => decision.playerId,
  [PendingDecisionType.SpeedDieDestination]: (decision) => decision.playerId,
  [PendingDecisionType.BuildingPlacement]: (decision) => decision.playerId,
};

/**
 * The player who must answer the pending decision, or `null` when none must.
 *
 * `null` covers three situations deliberately: there is no decision, the game
 * is over, or the auction the decision names is not the one in progress. All
 * three mean "nobody may act on a decision", and the last fails closed.
 */
export const decisionOwnerOf = (state: GameState): PlayerId | null => {
  const decision = state.pendingDecision;
  // The lookup is exhaustive by construction; TypeScript cannot correlate the
  // key with the value's parameter type through an index access, so the cast
  // is at this one line rather than spread through twelve call sites.
  const resolve = OWNER_OF[decision.type] as (
    decision: PendingDecision,
    state: GameState
  ) => PlayerId | null;

  return resolve(decision, state);
};

/**
 * Who may send a command right now: the pending decision's owner, or - when
 * nothing is pending - whoever's turn it is. `null` once the game is over.
 */
export const getExpectedActorId = (state: GameState): PlayerId | null => {
  if (state.pendingDecision.type === PendingDecisionType.None) {
    return getActivePlayer(state).id;
  }
  return decisionOwnerOf(state);
};

/**
 * Whose holdings the property commands operate on.
 *
 * Separate from `getExpectedActorId` on purpose, and the difference is the
 * whole point: during a liquidation it is the debtor, because raising cash is
 * what the decision is asking them to do. Everywhere else - including during
 * an auction, where the expected actor is the bidder - it stays the active
 * player, exactly as before, so mortgaging mid-auction keeps working the way
 * it does today.
 */
export const getAssetHolderId = (state: GameState): PlayerId => {
  const decision = state.pendingDecision;
  if (decision.type === PendingDecisionType.AssetLiquidation) {
    return decision.playerId;
  }
  return getActivePlayer(state).id;
};

/** The same player, as a record - what the property commands actually want. */
export const getAssetHolder = (state: GameState): PlayerState =>
  getPlayerById(state, getAssetHolderId(state));

/**
 * Commands that raise cash out of what a player already owns.
 *
 * These follow `getAssetHolderId` rather than the expected actor, because they
 * are how a debtor answers a liquidation. Redeeming and building are not here:
 * both spend money rather than raise it, and both stay the active player's.
 */
const CASH_RAISING_COMMANDS: ReadonlySet<GameCommandType> = new Set([
  GameCommandType.MortgageAsset,
  GameCommandType.SellHouse,
  GameCommandType.SellHotel,
]);

/** The player a given command will act as, whoever sent it. */
export const commandActorId = (
  state: GameState,
  command: RuntimeGameCommand
): PlayerId | null =>
  CASH_RAISING_COMMANDS.has(command.type)
    ? getAssetHolderId(state)
    : getExpectedActorId(state);

/**
 * Why `playerId` may not send this command, or `null` when they may.
 *
 * Stated once so the engine can throw from it and a control can disable from
 * it, exactly as `bidBlockedReason` and `buyBlockedReason` already do.
 */
export const actorBlockedReason = (
  state: GameState,
  command: RuntimeGameCommand,
  playerId: PlayerId
): string | null => {
  const expected = commandActorId(state, command);

  if (expected === null) {
    return 'No one can act right now';
  }
  if (expected !== playerId) {
    const name = state.players[expected]?.name ?? 'Another player';
    return `It is ${name}'s move`;
  }
  return null;
};
