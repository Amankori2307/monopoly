import { JAIL_POSITION, PASS_GO_AMOUNT } from '../../constants/game.constants';
import {
  DeckName,
  MoveDirection,
  PendingDecisionType,
  SpaceKind,
  TurnPhase,
} from '../../types/game.enums';
import type { GameState, OwnableSpace, PlayerId } from '../../types/game.interfaces';
import { isOwnableSpace } from '../space.utils';
import { drawCard } from './cards.utils';
import { creditFromBank, resolveBankPayment, resolvePlayerPayment } from './money.utils';
import { getRentForSpace } from './rent.utils';
import { appendEvents, createEvent, getPlayerById, updatePlayer } from './state.utils';

/**
 * Moving a token, and settling whatever it landed on.
 *
 * resolveCurrentSpace is the heart of a turn: it charges the tax, draws the
 * card, demands the rent, or raises the buy decision. Every arrival goes
 * through it - rolled, card-driven, or a Speed Die advance - which is why the
 * rent it charges takes the dice total as an argument rather than reading the
 * turn: a player brought here by a card did not roll to get here.
 */

/**
 * The single way a token changes space.
 *
 * `direction` has no default: every caller states which way the token went,
 * because two readers depend on it and neither can recover it. The GO salary is
 * only paid going forward, and the walking animation reads `player.lastMove` to
 * know which way round the board to step - it used to guess from the position
 * change, which cannot tell "back three spaces" from thirty-seven forward.
 */
export const movePlayerTo = (
  state: GameState,
  playerId: PlayerId,
  nextPosition: number,
  collectGo: boolean,
  direction: MoveDirection
): GameState => {
  const player = getPlayerById(state, playerId);
  let nextState = state;

  // Deliberately `passesGo`, not a bare position comparison: `next < current`
  // is also true of every backward move, so a card that moved a player back
  // past GO with collectGo set would have paid them for it.
  const passesGo =
    collectGo && direction === MoveDirection.Forward && nextPosition < player.position;

  if (passesGo) {
    nextState = creditFromBank(nextState, playerId, PASS_GO_AMOUNT, 'passing GO');
    // The Speed Die stays out of play until everyone has been round once, so
    // the trip past GO is worth recording as well as paying.
    nextState = updatePlayer(nextState, playerId, (currentPlayer) => ({
      ...currentPlayer,
      hasPassedGo: true,
    }));
  }

  return updatePlayer(nextState, playerId, (currentPlayer) => ({
    ...currentPlayer,
    position: nextPosition,
    lastMove: direction,
  }));
};

/**
 * Sends a player to Jail: backward, and never paid for the trip.
 *
 * Backward is the truthful direction. The printed rule is that you do not pass
 * GO on the way, so walking the token forward round the board would show a trip
 * that did not happen - and from a Chance space just past GO, Jail is only a few
 * spaces ahead, so it looked exactly like an ordinary roll.
 *
 * It goes through `movePlayerTo` rather than setting `position` itself, which is
 * what guarantees the salary cannot leak in: `collectGo` is false *and* the
 * direction is backward, and either alone would be enough.
 */
export const sendPlayerToJail = (
  state: GameState,
  playerId: PlayerId,
  reason: string
): GameState => {
  let nextState = movePlayerTo(
    state,
    playerId,
    JAIL_POSITION,
    false,
    MoveDirection.Backward
  );
  nextState = updatePlayer(nextState, playerId, (player) => ({
    ...player,
    inJail: true,
    jailTurnsServed: 0,
  }));

  nextState = {
    ...nextState,
    pendingDecision: { type: PendingDecisionType.None },
    turn: {
      ...nextState.turn,
      phase: TurnPhase.TurnComplete,
      canRollAgain: false,
      reason,
    },
  };

  return appendEvents(nextState, [
    createEvent(
      nextState.turnNumber,
      `${getPlayerById(state, playerId).name} was sent to Jail.`
    ),
  ]);
};

/**
 * What landing on a buyable space costs, or asks.
 *
 * Three outcomes: nobody owns it, so the player is asked; somebody else does,
 * so rent is owed; or it is theirs, or mortgaged, and nothing happens. Split out
 * of resolveCurrentSpace to keep that function under the complexity limit -
 * this is the one branch of it with branches of its own.
 */
const resolveOwnableSpace = (
  state: GameState,
  playerId: PlayerId,
  space: OwnableSpace,
  rentDiceTotal: number
): GameState => {
  const ownership = state.ownership[space.id];
  const player = getPlayerById(state, playerId);

  if (!ownership.ownerPlayerId) {
    return {
      ...state,
      pendingDecision: {
        type: PendingDecisionType.LandedUnownedProperty,
        spaceId: space.id,
        playerId: player.id,
      },
      turn: {
        ...state.turn,
        phase: TurnPhase.AwaitDecision,
        reason: `Decide whether to buy ${space.name}.`,
      },
    };
  }

  // Their own site, or a mortgaged one, which collects nothing.
  if (ownership.ownerPlayerId === player.id || ownership.mortgaged) {
    return state;
  }

  const owner = getPlayerById(state, ownership.ownerPlayerId);
  // resolvePlayerPayment logs the settled payment. It used to be logged here as
  // well, unconditionally - so a player who could not afford the rent still got
  // a "paid" line while being routed to liquidation.
  return resolvePlayerPayment(
    state,
    player.id,
    owner.id,
    getRentForSpace(state, space, owner.id, rentDiceTotal),
    `rent on ${space.name}`
  );
};

/** Which phase the turn lands in once the current space has resolved. */
export const resolvePhaseAfterLanding = (
  isBlockedByDecision: boolean,
  canRollAgain: boolean
): TurnPhase => {
  if (isBlockedByDecision) {
    return TurnPhase.AwaitDecision;
  }
  return canRollAgain ? TurnPhase.AwaitExtraRollOrEnd : TurnPhase.TurnComplete;
};

export const resolveCurrentSpace = (
  state: GameState,
  playerId: PlayerId,
  allowExtraRoll: boolean,
  /**
   * The dice total a utility's rent is charged on. Defaults to the turn's own
   * roll, which is right when the player got here by rolling. A player brought
   * here another way - a card, a Mr. Monopoly advance - throws afresh, which is
   * the printed rule and is why this is a parameter rather than a lookup.
   */
  rentDiceTotal?: number
): GameState => {
  const player = getPlayerById(state, playerId);
  const space = state.board[player.position];
  const lastRollTotal =
    rentDiceTotal ?? state.turn.lastRoll?.reduce((sum, roll) => sum + roll, 0) ?? 0;
  let nextState = state;

  if (space.kind === SpaceKind.Tax) {
    nextState = resolveBankPayment(nextState, player.id, space.amount, `${space.name}`);
  } else if (space.kind === SpaceKind.GoToJail) {
    return sendPlayerToJail(nextState, player.id, 'Landed on Go To Jail');
  } else if (space.kind === SpaceKind.Chance) {
    nextState = drawCard(nextState, DeckName.Chance);
  } else if (space.kind === SpaceKind.CommunityChest) {
    nextState = drawCard(nextState, DeckName.CommunityChest);
  } else if (isOwnableSpace(space)) {
    nextState = resolveOwnableSpace(nextState, playerId, space, lastRollTotal);
  }

  // Going to jail ends the turn outright, even on doubles. sendPlayerToJail
  // already sets that, but a Chance / Community Chest card routes back through
  // here afterwards, and the phase assignment below would otherwise hand a
  // jailed player an extra roll - leaving them able to roll while in jail, which
  // the engine then rejects.
  if (getPlayerById(nextState, playerId).inJail) {
    return {
      ...nextState,
      turn: {
        ...nextState.turn,
        phase: TurnPhase.TurnComplete,
        canRollAgain: false,
      },
    };
  }

  const isBlockedByDecision = nextState.pendingDecision.type !== PendingDecisionType.None;
  const canRollAgain = allowExtraRoll && !isBlockedByDecision;

  return {
    ...nextState,
    turn: {
      ...nextState.turn,
      phase: resolvePhaseAfterLanding(isBlockedByDecision, canRollAgain),
      canRollAgain,
      reason: isBlockedByDecision ? nextState.turn.reason : null,
    },
  };
};

/**
 * Moves a player forward and resolves where they land.
 *
 * Shared by the ordinary roll and every Speed Die face, so a bus move and a
 * rolled move cannot drift apart in what they collect or resolve.
 */
export const advanceAndResolve = (
  state: GameState,
  playerId: PlayerId,
  steps: number,
  allowExtraRoll: boolean,
  rentDiceTotal?: number
): GameState => {
  const player = getPlayerById(state, playerId);
  const destination = (player.position + steps) % state.board.length;
  const moved = movePlayerTo(state, playerId, destination, true, MoveDirection.Forward);
  return resolveCurrentSpace(moved, playerId, allowExtraRoll, rentDiceTotal);
};
