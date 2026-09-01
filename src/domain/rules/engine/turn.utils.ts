import {
  SpeedDieFace,
  GameStatus,
  PendingDecisionType,
  TurnPhase,
} from '../../types/game.enums';
import type { GameState, PlayerId, SpaceId } from '../../types/game.interfaces';
import { isOwnableSpace } from '../space.utils';
import { rollDie, type RandomSource } from '../rng';
import { advanceAndResolve } from './movement.utils';
import { appendEvents, createEvent, getPlayerById } from './state.utils';

/**
 * Whose turn it is, and what happens between turns.
 *
 * Two things here are easy to get wrong and are stated once so nothing else has
 * to remember them:
 *
 * resumeTurnAfterDecision restores the phase from `doublesCount`, not from
 * `canRollAgain` - resolveCurrentSpace sets that false whenever a decision
 * blocks the turn, so reading it back would silently eat a player's extra roll.
 *
 * A pending Mr. Monopoly advance is applied here too, because the space it
 * lands on may raise a decision of its own. Any command that answers a decision
 * goes through this rather than restating the phase rules.
 */

/**
 * The next seat that is still in the game.
 *
 * Rotation used to advance by one and wrap, which was harmless only because
 * nobody could go bankrupt. Falls back to the current seat when everyone else is
 * out - the caller is then looking at a finished game.
 */
export const nextActivePlayerIndex = (state: GameState): number => {
  for (let step = 1; step <= state.playerOrder.length; step += 1) {
    const candidate = (state.activePlayerIndex + step) % state.playerOrder.length;
    if (!state.players[state.playerOrder[candidate]].isBankrupt) {
      return candidate;
    }
  }
  return state.activePlayerIndex;
};

export const advanceToNextTurn = (state: GameState): GameState => {
  const nextIndex = nextActivePlayerIndex(state);
  const nextPlayerId = state.playerOrder[nextIndex];
  const nextPlayer = getPlayerById(state, nextPlayerId);

  return {
    ...state,
    activePlayerIndex: nextIndex,
    turnNumber: state.turnNumber + 1,
    pendingDecision: nextPlayer.inJail
      ? { type: PendingDecisionType.JailChoice, playerId: nextPlayer.id }
      : { type: PendingDecisionType.None },
    turn: {
      phase: nextPlayer.inJail ? TurnPhase.AwaitDecision : TurnPhase.AwaitRoll,
      doublesCount: 0,
      lastRoll: null,
      canRollAgain: false,
      speedDieFace: null,
      pendingMonopolyAdvance: false,
      reason: nextPlayer.inJail
        ? `${nextPlayer.name} must choose how to leave Jail.`
        : null,
    },
  };
};

export const resumeTurnAfterDecision = (
  state: GameState,
  randomSource: RandomSource
): GameState => {
  // A Mr. Monopoly advance owed from before the decision is still owed now.
  const owedAdvance = state.turn.pendingMonopolyAdvance;
  const advanced = owedAdvance
    ? applyPendingMonopolyAdvance(
        state,
        state.playerOrder[state.activePlayerIndex],
        randomSource
      )
    : state;
  // Only when the advance actually ran and raised a decision of its own: some
  // callers resume before clearing the decision they answered, and that is not
  // the same thing at all.
  if (owedAdvance && advanced.pendingDecision.type !== PendingDecisionType.None) {
    return advanced;
  }

  const canRollAgain = advanced.turn.doublesCount > 0;

  return {
    ...advanced,
    turn: {
      ...advanced.turn,
      phase: canRollAgain ? TurnPhase.AwaitExtraRollOrEnd : TurnPhase.TurnComplete,
      canRollAgain,
      reason: null,
    },
  };
};

/** How a Speed Die face reads in the history. */
export const describeSpeedDie = (face: SpeedDieFace): string => {
  if (face === SpeedDieFace.Bus) return 'a Bus';
  if (face === SpeedDieFace.MrMonopoly) return 'Mr. Monopoly';
  return face;
};

/**
 * Mr. Monopoly's advance: on to the next unowned asset, or failing that the
 * next one an opponent owns.
 *
 * Returns the number of forward steps, or null when there is nothing to advance
 * to - which happens only when the player owns every asset on the board, and is
 * a win in all but name.
 */
export const findMonopolyAdvance = (
  state: GameState,
  playerId: PlayerId
): number | null => {
  const player = getPlayerById(state, playerId);
  const size = state.board.length;

  const stepsTo = (predicate: (spaceId: SpaceId) => boolean): number | null => {
    for (let steps = 1; steps <= size; steps += 1) {
      const space = state.board[(player.position + steps) % size];
      if (isOwnableSpace(space) && predicate(space.id)) {
        return steps;
      }
    }
    return null;
  };

  // Unowned first: the printed rule is to buy or auction if anything is going.
  const unowned = stepsTo((spaceId) => !state.ownership[spaceId]?.ownerPlayerId);
  if (unowned !== null) return unowned;

  return stepsTo((spaceId) => {
    const owner = state.ownership[spaceId]?.ownerPlayerId;
    return Boolean(owner) && owner !== playerId;
  });
};

/**
 * Carries out an owed Mr. Monopoly advance, if the turn is clear to take it.
 *
 * Called wherever a space finishes resolving - both straight after the landing
 * and after a decision that landing raised has been answered - because the
 * advance is owed either way.
 */
export const applyPendingMonopolyAdvance = (
  state: GameState,
  playerId: PlayerId,
  randomSource: RandomSource
): GameState => {
  if (!state.turn.pendingMonopolyAdvance) return state;
  if (state.pendingDecision.type !== PendingDecisionType.None) return state;

  // Cleared before the advance, so the decision the advance itself may raise
  // cannot send us round again.
  const cleared: GameState = {
    ...state,
    turn: { ...state.turn, pendingMonopolyAdvance: false },
  };

  const steps = findMonopolyAdvance(cleared, playerId);
  if (steps === null) return cleared;

  const player = getPlayerById(cleared, playerId);
  const target = cleared.board[(player.position + steps) % cleared.board.length];
  const announced = appendEvents(cleared, [
    createEvent(
      cleared.turnNumber,
      `Mr. Monopoly moved ${player.name} on to ${target.name}.`
    ),
  ]);

  // A utility reached this way is charged on a fresh throw, not on the roll
  // that started the turn - the player did not roll their way here.
  return advanceAndResolve(
    announced,
    playerId,
    steps,
    cleared.turn.doublesCount > 0,
    rollDie(randomSource) + rollDie(randomSource)
  );
};

/**
 * Ends the game when only one player is left standing.
 *
 * Called after a bankruptcy, the only way a player leaves. Setting the status
 * is what stops further commands - ensureGameNotFinished already rejects
 * everything once the game is no longer in progress.
 */
export const concludeIfWon = (state: GameState): GameState => {
  const survivors = state.playerOrder.filter(
    (playerId) => !state.players[playerId].isBankrupt
  );
  if (survivors.length !== 1) {
    return state;
  }

  const winner = getPlayerById(state, survivors[0]);
  return appendEvents(
    {
      ...state,
      status: GameStatus.Completed,
      winnerPlayerId: winner.id,
      pendingDecision: { type: PendingDecisionType.GameOver },
      turn: { ...state.turn, phase: TurnPhase.TurnComplete, canRollAgain: false },
    },
    [createEvent(state.turnNumber, `${winner.name} won the game.`)]
  );
};

export const ensureGameNotFinished = (state: GameState) => {
  if (state.status !== GameStatus.InProgress) {
    throw new Error('This game is already complete.');
  }
};
