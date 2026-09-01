import {
  GameCommandType,
  PendingDecisionType,
  TurnPhase,
} from '../../../types/game.enums';
import { rollDie } from '../../rng';
import { advanceAndResolve } from '../movement.utils';
import { appendEvents, createEvent, getPlayerById } from '../state.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * The two Speed Die faces that ask the player something.
 *
 * A Bus lets them choose one white die or both; three matching dice let them
 * move to any space on the board. Neither is a double, so neither grants
 * another roll.
 */

export const speedDieCommands: CommandHandlers = {
  [GameCommandType.ChooseBusMove]: (state, command, _randomSource) => {
    let nextState = state;
    const decision = nextState.pendingDecision;
    if (decision.type !== PendingDecisionType.SpeedDieBus) {
      throw new Error('There is no bus to catch.');
    }
    const [whiteOne, whiteTwo] = decision.whiteDice;
    // One die, the other, or both - and nothing else. A free choice of steps
    // would be a different game.
    const allowed = [whiteOne, whiteTwo, whiteOne + whiteTwo];
    if (!allowed.includes(command.steps)) {
      throw new Error(
        `A bus moves ${whiteOne}, ${whiteTwo} or ${whiteOne + whiteTwo} spaces.`
      );
    }

    const busPlayer = getPlayerById(nextState, decision.playerId);
    nextState = {
      ...nextState,
      pendingDecision: { type: PendingDecisionType.None },
      turn: { ...nextState.turn, phase: TurnPhase.ResolvingMovement, reason: null },
    };
    nextState = appendEvents(nextState, [
      createEvent(
        nextState.turnNumber,
        `${busPlayer.name} took the bus ${command.steps} spaces.`
      ),
    ]);
    // The white dice were a double, so the extra roll still follows: the bus
    // decides how far, not whether the turn continues.
    nextState = advanceAndResolve(
      nextState,
      decision.playerId,
      command.steps,
      whiteOne === whiteTwo
    );
    return nextState;
  },
  [GameCommandType.ChooseSpeedDieDestination]: (state, command, randomSource) => {
    let nextState = state;
    const decision = nextState.pendingDecision;
    if (decision.type !== PendingDecisionType.SpeedDieDestination) {
      throw new Error('There is no free move to make.');
    }
    const target = nextState.board.findIndex((space) => space.id === command.spaceId);
    if (target < 0) {
      throw new Error('No such space.');
    }

    const moving = getPlayerById(nextState, decision.playerId);
    nextState = {
      ...nextState,
      pendingDecision: { type: PendingDecisionType.None },
      turn: { ...nextState.turn, phase: TurnPhase.ResolvingMovement, reason: null },
    };
    nextState = appendEvents(nextState, [
      createEvent(
        nextState.turnNumber,
        `${moving.name} moved to ${nextState.board[target].name}.`
      ),
    ]);
    // Forward round the board, so the trip past GO is paid for like any
    // other - the printed rule moves the token, it does not teleport it.
    const forwardSteps =
      (target - moving.position + nextState.board.length) % nextState.board.length;
    // A triple grants no extra roll: it is not a double. And a utility picked
    // this way is charged on a fresh throw rather than the matching triple.
    nextState = advanceAndResolve(
      nextState,
      decision.playerId,
      forwardSteps,
      false,
      rollDie(randomSource) + rollDie(randomSource)
    );
    return nextState;
  },
};
