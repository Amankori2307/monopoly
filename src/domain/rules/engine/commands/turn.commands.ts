import { DOUBLES_BEFORE_JAIL } from '../../../constants/game.constants';
import {
  GameCommandType,
  PendingDecisionType,
  SpeedDieFace,
  TurnPhase,
} from '../../../types/game.enums';
import { rollDie } from '../../rng';
import {
  isSpeedDieActive,
  isTriple,
  rollSpeedDie,
  speedDieSteps,
} from '../../speedDie.utils';
import { advanceAndResolve, sendPlayerToJail } from '../movement.utils';
import { appendEvents, createEvent, getActivePlayer } from '../state.utils';
import {
  advanceToNextTurn,
  applyPendingMonopolyAdvance,
  describeSpeedDie,
} from '../turn.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * Rolling, and ending a turn.
 *
 * The roll is the busiest command in the game: two white dice decide doubles
 * and the third, when a Speed Die game is under way, decides nothing about them
 * - it is added after the doubles check, so it can neither create nor break
 * one. Three white doubles is Jail, and a three-of-a-kind is not a double at
 * all.
 */

export const turnCommands: CommandHandlers = {
  [GameCommandType.RollTurnDice]: (state, _command, randomSource) => {
    let nextState = state;
    const activePlayer = getActivePlayer(nextState);
    if (activePlayer.inJail) {
      throw new Error('Player must choose a Jail action first.');
    }
    if (
      nextState.turn.phase !== TurnPhase.AwaitRoll &&
      nextState.turn.phase !== TurnPhase.AwaitExtraRollOrEnd
    ) {
      throw new Error('Rolling is not available right now.');
    }

    const dieOne = rollDie(randomSource);
    const dieTwo = rollDie(randomSource);
    // Only the white dice decide a double. The Speed Die is rolled after,
    // and a matching face is irrelevant to it.
    const isDouble = dieOne === dieTwo;
    const speedDieFace = isSpeedDieActive(nextState) ? rollSpeedDie(randomSource) : null;
    const rolledTriple = isTriple(dieOne, dieTwo, speedDieFace);
    // A triple is its own outcome, not a double: it grants no extra roll and
    // it does not count towards the three that send a player to Jail.
    const nextDoublesCount =
      isDouble && !rolledTriple ? nextState.turn.doublesCount + 1 : 0;

    nextState = {
      ...nextState,
      turn: {
        phase: TurnPhase.ResolvingMovement,
        doublesCount: nextDoublesCount,
        lastRoll: [dieOne, dieTwo],
        canRollAgain: false,
        speedDieFace,
        // Mr. Monopoly's advance is owed once the landed space has resolved.
        pendingMonopolyAdvance: speedDieFace === SpeedDieFace.MrMonopoly,
        reason: null,
      },
    };
    nextState = appendEvents(nextState, [
      createEvent(
        nextState.turnNumber,
        speedDieFace
          ? `${activePlayer.name} rolled ${dieOne}, ${dieTwo} and ${describeSpeedDie(speedDieFace)}.`
          : `${activePlayer.name} rolled ${dieOne} and ${dieTwo}.`
      ),
    ]);

    if (nextDoublesCount === DOUBLES_BEFORE_JAIL) {
      nextState = sendPlayerToJail(
        nextState,
        activePlayer.id,
        'Rolled doubles three times'
      );
      return nextState;
    }

    // Three of a kind: the player picks anywhere on the board.
    if (rolledTriple) {
      nextState = {
        ...nextState,
        pendingDecision: {
          type: PendingDecisionType.SpeedDieDestination,
          playerId: activePlayer.id,
        },
        turn: {
          ...nextState.turn,
          phase: TurnPhase.AwaitDecision,
          reason: `${activePlayer.name} may move to any space.`,
        },
      };
      return nextState;
    }

    // A Bus lets the player choose which white dice to move by, so the move
    // waits on their answer.
    if (speedDieFace === SpeedDieFace.Bus) {
      nextState = {
        ...nextState,
        pendingDecision: {
          type: PendingDecisionType.SpeedDieBus,
          playerId: activePlayer.id,
          whiteDice: [dieOne, dieTwo],
        },
        turn: {
          ...nextState.turn,
          phase: TurnPhase.AwaitDecision,
          reason: `${activePlayer.name} caught the bus.`,
        },
      };
      return nextState;
    }

    nextState = advanceAndResolve(
      nextState,
      activePlayer.id,
      dieOne + dieTwo + speedDieSteps(speedDieFace),
      isDouble
    );
    nextState = applyPendingMonopolyAdvance(nextState, activePlayer.id, randomSource);
    return nextState;
  },
  [GameCommandType.EndTurn]: (state, _command, _randomSource) => {
    let nextState = state;
    if (
      nextState.turn.phase !== TurnPhase.TurnComplete &&
      nextState.turn.phase !== TurnPhase.AwaitExtraRollOrEnd
    ) {
      throw new Error('Turn cannot be ended yet.');
    }
    if (nextState.turn.canRollAgain) {
      nextState = {
        ...nextState,
        turn: {
          ...nextState.turn,
          phase: TurnPhase.AwaitRoll,
          canRollAgain: false,
        },
      };
    } else {
      nextState = advanceToNextTurn(nextState);
    }
    return nextState;
  },
};
