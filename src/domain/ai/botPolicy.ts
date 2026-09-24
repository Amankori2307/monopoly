import {
  GameCommandType,
  PendingDecisionType,
  SpaceKind,
  TurnPhase,
} from '../types/game.enums';
import type { PendingDecision } from '../types/decisions.interfaces';
import type {
  GameState,
  PlayerId,
  RuntimeGameCommand,
  SpaceId,
} from '../types/game.interfaces';
import { getExpectedActorId } from '../rules/actor.utils';
import { bidBlockedReason, minimumBidFor } from '../rules/auctionBids.utils';
import { getPlacementSites } from '../rules/buildings.utils';
import { getThemeOrDefault } from '../rules/engine/state.utils';
import { buyBlockedReason } from '../rules/playerActions.utils';
import { isOwnableSpace } from '../rules/space.utils';
import { buildCommand, isRuined, raiseCashCommand } from './botCashRaising.utils';
import { auctionCeilingFor, wantsToBuy } from './botValuation.utils';

/**
 * What a bot does next, as one pure function of the state.
 *
 * It is a `GameCommand` factory and nothing else: it applies no state, holds no
 * memory between calls and touches neither React nor the store, so it lives
 * under `domain/` with the engine it speaks to. The driver in `features/`
 * decides *when* to ask; this only ever answers *what*.
 *
 * Deterministic on purpose, with no `RandomSource` at all. A bot that rolled
 * its own dice to pick a move would make the same save play out differently
 * twice, and the one thing worth having when a bot deadlocks a game is the
 * ability to hand its save to a test.
 *
 * **Null means "no legal move", and the driver must stop on it.** That covers
 * three honest cases - it is not a bot's move, the game is over, and a decision
 * no command answers - and one dishonest one: a turn stuck in `AwaitDecision`
 * with nothing pending, which is the deadlock `selectHasAvailableAction` exists
 * to catch. A bot cannot fix that, and inventing a command to escape it would
 * throw out of the engine.
 */

/**
 * One resolver per decision type, the arrangement `actor.utils` uses and for
 * the same reason: a new decision type is a compile error here rather than a
 * bot that silently sits on it and hangs the game for every human at the table.
 * A `switch` with a `default` would have been the version that rots.
 */
type BotDecisionResolvers = {
  [K in PendingDecision['type']]: (
    decision: Extract<PendingDecision, { type: K }>,
    state: GameState,
    actorId: PlayerId
  ) => RuntimeGameCommand | null;
};

/** Getting out of Jail, wherever the choice is offered from. */
const leaveJail = (state: GameState, actorId: PlayerId): RuntimeGameCommand => {
  if (state.players[actorId].jailFreeCards.length > 0) {
    return { type: GameCommandType.UseJailFreeCard };
  }
  /**
   * Otherwise roll, and never pay voluntarily.
   *
   * The roll is free and the fine is not, and the engine already charges the
   * fine on the third failure - so paying early buys one thing only: certainty
   * about a move the bot has no particular use for. Where that certainty is
   * worth 50 is a judgement about the board a bot this size cannot make, and
   * the rule that needs no judgement is the better one to state.
   */
  return { type: GameCommandType.AttemptJailRoll };
};

/** Where to go with a free move: somewhere worth buying, or GO for the salary. */
const freeDestination = (state: GameState, actorId: PlayerId): SpaceId => {
  const wanted = state.board.find(
    (space) =>
      isOwnableSpace(space) &&
      !state.ownership[space.id]?.ownerPlayerId &&
      wantsToBuy(state, space.id, actorId)
  );
  if (wanted) {
    return wanted.id;
  }
  // GO, and not merely as a fallback: `movePlayerTo` pays the salary on a
  // forward move that wraps, so the worst answer here still collects 200.
  return (state.board.find((space) => space.kind === SpaceKind.Go) ?? state.board[0]).id;
};

const RESOLVERS: BotDecisionResolvers = {
  [PendingDecisionType.None]: () => null,

  // Nobody acts on a finished game. The driver stops here rather than on a
  // missing actor, because `getExpectedActorId` is null by then too.
  [PendingDecisionType.GameOver]: () => null,

  /**
   * Declared on `PendingDecision` and never raised by the engine - nothing
   * assigns it, and no command answers it. Null rather than a guess: a bot that
   * sent `confirmBankruptcy` here would be refused, since that command insists
   * on an `asset-liquidation`. If this type ever becomes reachable it needs a
   * real answer, and the type system will not remind anyone - this comment is
   * the reminder.
   */
  [PendingDecisionType.BankruptcyResolution]: () => null,

  [PendingDecisionType.LandedUnownedProperty]: (decision, state, actorId) => {
    const space = state.board.find((candidate) => candidate.id === decision.spaceId);
    const price = space && isOwnableSpace(space) ? space.price : Number.POSITIVE_INFINITY;
    // Both questions, in this order. `buyBlockedReason` is the RULE and the
    // engine throws from it; `wantsToBuy` is only an opinion. Asking the
    // opinion alone is how a bot offers the engine a command it will refuse.
    const blocked = buyBlockedReason(state.players[actorId].cash, price);
    return blocked === null && wantsToBuy(state, decision.spaceId, actorId)
      ? { type: GameCommandType.BuyLandedAsset }
      : { type: GameCommandType.DeclineLandedAsset };
  },

  [PendingDecisionType.AuctionBid]: (decision, state, actorId) => {
    const auction = state.auctionState;
    // Matching the id rather than "there is an auction", exactly as
    // `decisionOwnerOf` does: a queued bankruptcy auction can have replaced its
    // predecessor, and bidding into the wrong lot is worse than passing.
    if (!auction || auction.id !== decision.auctionId) {
      return null;
    }
    const minimum = minimumBidFor(auction);
    const ceiling = auctionCeilingFor(state, auction.spaceId, actorId);
    const refusal = bidBlockedReason(
      auction,
      state.players[actorId].cash,
      minimum,
      getThemeOrDefault(state.themeId).currencySymbol
    );
    // The minimum, never more. An auction escalates on its own as the other
    // bidders answer, so bidding the least that takes the lead reaches the same
    // winner for less money - and the ceiling is what ends it.
    return minimum <= ceiling && refusal === null
      ? { type: GameCommandType.SubmitAuctionBid, amount: minimum }
      : { type: GameCommandType.PassAuction };
  },

  [PendingDecisionType.JailChoice]: (_decision, state, actorId) =>
    leaveJail(state, actorId),

  [PendingDecisionType.CardDraw]: () => ({ type: GameCommandType.AcknowledgeCard }),

  /**
   * Cash first, then the squares, then the exit.
   *
   * The order is the engine's own: `settleDebt` throws while the cash is short,
   * and `confirmBankruptcy` throws while the debt is still reachable - so these
   * three branches are not a preference, they are the only sequence that does
   * not raise.
   */
  [PendingDecisionType.AssetLiquidation]: (decision, state, actorId) => {
    if (state.players[actorId].cash >= decision.amountDue) {
      return { type: GameCommandType.SettleDebt };
    }
    if (isRuined(state, actorId, decision.amountDue)) {
      return { type: GameCommandType.ConfirmBankruptcy };
    }
    return raiseCashCommand(state, actorId, decision.amountDue);
  },

  /**
   * A bot declines every trade, and that is a stated limit rather than a stub.
   *
   * Valuing an offer means valuing a colour set against cash against position,
   * which is the whole of Monopoly strategy - and a bot that accepted badly
   * would be worse than one that never accepts, because a human would find the
   * lever and the game would stop being a game. Rejecting is always legal and
   * always resolves the decision, so no trade can ever hang a table.
   */
  [PendingDecisionType.TradeResponse]: () => ({ type: GameCommandType.RejectTrade }),

  [PendingDecisionType.SpeedDieBus]: (decision) => ({
    type: GameCommandType.ChooseBusMove,
    // Both dice: the distance an ordinary roll would have covered anyway, and
    // the only one of the three choices that needs no view about where the bot
    // would rather land.
    steps: decision.whiteDice[0] + decision.whiteDice[1],
  }),

  [PendingDecisionType.SpeedDieDestination]: (_decision, state, actorId) => ({
    type: GameCommandType.ChooseSpeedDieDestination,
    spaceId: freeDestination(state, actorId),
  }),

  [PendingDecisionType.BuildingPlacement]: (decision, state) => {
    // Straight from the engine's own list, so the square is one it will accept.
    const sites = getPlacementSites(state, decision.playerId, decision.buildingKind);
    const site = sites[0];
    return site
      ? { type: GameCommandType.ChooseBuildingSite, spaceId: site.spaceId }
      : null;
  },
};

/**
 * What to do when nothing is pending: roll, or spend the turn's end usefully.
 *
 * Jail is checked first and only at `AwaitRoll`, because the Jail panel is
 * derived from `player.inJail` rather than from `pendingDecision` - so a jailed
 * player's choice arrives with no decision on the state at all. Reading it at
 * any other phase would send a second Jail roll into a turn that has had one,
 * which the engine refuses.
 */
const chooseTurnCommand = (
  state: GameState,
  actorId: PlayerId
): RuntimeGameCommand | null => {
  const player = state.players[actorId];
  const { phase, canRollAgain } = state.turn;

  if (player.inJail && phase === TurnPhase.AwaitRoll) {
    return leaveJail(state, actorId);
  }
  if (phase === TurnPhase.AwaitRoll) {
    return { type: GameCommandType.RollTurnDice };
  }
  if (phase === TurnPhase.AwaitExtraRollOrEnd && canRollAgain) {
    return { type: GameCommandType.RollTurnDice };
  }
  if (phase === TurnPhase.AwaitExtraRollOrEnd || phase === TurnPhase.TurnComplete) {
    // Building happens at the end of a turn, which is the only moment a bot
    // knows what this turn cost it. Ending is what is left.
    return buildCommand(state, actorId) ?? { type: GameCommandType.EndTurn };
  }
  // ResolvingMovement, ResolvingSpace, and an AwaitDecision with nothing
  // pending. The first two are transient - the engine passes through them
  // inside one synchronous command - and the third is the deadlock, which no
  // command can answer.
  return null;
};

/** Whether this player is driven by the machine rather than by somebody. */
export const isBotPlayer = (state: GameState, playerId: PlayerId): boolean =>
  state.players[playerId]?.isBot === true;

/**
 * The command a bot should send now, or null when none should be sent.
 *
 * The actor comes from the STATE, never from a caller - `getExpectedActorId`,
 * the same predicate the engine checks commands against. A driver that passed
 * in "whose turn I think it is" would be the one place a bot could act out of
 * turn, and on an online table that is a device moving somebody else's piece.
 */
export const chooseBotCommand = (state: GameState): RuntimeGameCommand | null => {
  const actorId = getExpectedActorId(state);
  if (actorId === null || !isBotPlayer(state, actorId)) {
    return null;
  }
  if (state.players[actorId].isBankrupt) {
    /**
     * A bankruptcy does not end the turn it happened on.
     *
     * The engine leaves the ruined player ACTIVE at `TurnComplete` - they have
     * nothing left to do, and `advanceToNextTurn` is what skips them from then
     * on - so End turn is the one move still open to them, and it is what
     * passes play to everybody else. Refusing to answer here instead stops the
     * entire table: three solvent players, no decision on screen, and a turn
     * belonging to somebody who is out of the game.
     *
     * Found by playing four bots against each other rather than by reading the
     * code, which is the only way anyone was going to find it - a person in
     * this seat simply presses the button that is already in front of them.
     */
    return state.pendingDecision.type === PendingDecisionType.None &&
      (state.turn.phase === TurnPhase.TurnComplete ||
        state.turn.phase === TurnPhase.AwaitExtraRollOrEnd)
      ? { type: GameCommandType.EndTurn }
      : null;
  }

  const decision = state.pendingDecision;
  if (decision.type === PendingDecisionType.None) {
    return chooseTurnCommand(state, actorId);
  }

  // Exhaustive by construction; TypeScript cannot correlate the key with the
  // value's parameter type through an index access, so the cast is at this one
  // line rather than spread through twelve resolvers - `actor.utils` makes the
  // same trade for the same reason.
  const resolve = RESOLVERS[decision.type] as (
    decision: PendingDecision,
    state: GameState,
    actorId: PlayerId
  ) => RuntimeGameCommand | null;

  return resolve(decision, state, actorId);
};
