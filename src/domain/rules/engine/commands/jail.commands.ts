import {
  JAIL_FINE,
  JAIL_POSITION,
  MAX_JAIL_TURNS,
} from '../../../constants/game.constants';
import {
  GameCommandType,
  MoveDirection,
  PendingDecisionType,
  TurnPhase,
} from '../../../types/game.enums';
import { rollDie } from '../../rng';
import { returnJailCardToDeck } from '../cards.utils';
import { resolveBankPayment } from '../money.utils';
import { movePlayerTo, resolveCurrentSpace } from '../movement.utils';
import { appendEvents, createEvent, getActivePlayer, updatePlayer } from '../state.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * The three ways out of Jail, and the fourth that is forced on you.
 *
 * The rule worth stating: a player who cannot afford the fine stays in Jail.
 * Both paths that charge it - the voluntary fine and the mandatory third-turn
 * one - leave the liquidation decision standing rather than overwriting it,
 * which is what used to let a player with nothing walk out without paying.
 */

export const jailCommands: CommandHandlers = {
  [GameCommandType.PayJailFine]: (state, _command, _randomSource) => {
    let nextState = state;
    const activePlayer = getActivePlayer(nextState);
    if (!activePlayer.inJail) {
      throw new Error('Active player is not in Jail.');
    }
    nextState = resolveBankPayment(nextState, activePlayer.id, JAIL_FINE, 'Jail fine');
    // resolveBankPayment raises a liquidation when the player is short. Leave
    // it standing and leave them in Jail: overwriting it here let a player
    // with under the fine walk out without paying.
    if (nextState.pendingDecision.type === PendingDecisionType.AssetLiquidation) {
      return nextState;
    }
    nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
      ...player,
      inJail: false,
      jailTurnsServed: 0,
    }));
    nextState = {
      ...nextState,
      pendingDecision: { type: PendingDecisionType.None },
      turn: {
        ...nextState.turn,
        phase: TurnPhase.AwaitRoll,
        reason: null,
      },
    };
    return nextState;
  },
  [GameCommandType.UseJailFreeCard]: (state, _command, _randomSource) => {
    let nextState = state;
    const activePlayer = getActivePlayer(nextState);
    if (!activePlayer.inJail || activePlayer.jailFreeCards.length < 1) {
      throw new Error('Get Out of Jail Free card is not available.');
    }
    const [usedCard, ...keptCards] = activePlayer.jailFreeCards;
    nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
      ...player,
      inJail: false,
      jailTurnsServed: 0,
      jailFreeCards: keptCards,
    }));
    // Back to the bottom of its own deck. drawCard deliberately does not
    // recycle a jail card - a held card is out of play - so this is the only
    // thing that puts one back, and without it both left for good.
    nextState = returnJailCardToDeck(nextState, usedCard);
    nextState = {
      ...nextState,
      pendingDecision: { type: PendingDecisionType.None },
      turn: {
        ...nextState.turn,
        phase: TurnPhase.AwaitRoll,
        reason: null,
      },
    };
    return nextState;
  },
  [GameCommandType.AttemptJailRoll]: (state, _command, randomSource) => {
    let nextState = state;
    const activePlayer = getActivePlayer(nextState);
    if (!activePlayer.inJail) {
      throw new Error('Active player is not in Jail.');
    }
    // One roll per turn. The three-turn limit is three of the player's own
    // turns, each separated by everybody else's - not three rolls taken back to
    // back, which is what this guard's absence allowed.
    if (
      nextState.turn.phase !== TurnPhase.AwaitDecision &&
      nextState.turn.phase !== TurnPhase.AwaitRoll
    ) {
      throw new Error('Only one Jail roll per turn - end the turn first.');
    }
    const dieOne = rollDie(randomSource);
    const dieTwo = rollDie(randomSource);
    nextState = {
      ...nextState,
      turn: {
        phase: TurnPhase.ResolvingMovement,
        doublesCount: 0,
        lastRoll: [dieOne, dieTwo],
        canRollAgain: false,
        reason: null,
        // Only the white dice get a player out of Jail, so no Speed Die here.
        speedDieFace: null,
        pendingMonopolyAdvance: false,
      },
    };
    nextState = appendEvents(nextState, [
      createEvent(
        nextState.turnNumber,
        `${activePlayer.name} attempted a Jail roll and got ${dieOne} and ${dieTwo}.`
      ),
    ]);

    if (dieOne === dieTwo) {
      nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        inJail: false,
        jailTurnsServed: 0,
      }));
      nextState = movePlayerTo(
        nextState,
        activePlayer.id,
        (JAIL_POSITION + dieOne + dieTwo) % nextState.board.length,
        true,
        MoveDirection.Forward
      );
      nextState = resolveCurrentSpace(nextState, activePlayer.id, false);
    } else {
      const jailTurnsServed = activePlayer.jailTurnsServed + 1;
      nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        jailTurnsServed,
      }));
      if (jailTurnsServed >= MAX_JAIL_TURNS) {
        nextState = resolveBankPayment(
          nextState,
          activePlayer.id,
          JAIL_FINE,
          'Mandatory Jail fine'
        );
        // Same guard as PayJailFine: a player who cannot cover the mandatory
        // fine stays in Jail rather than being un-jailed and moved.
        if (nextState.pendingDecision.type === PendingDecisionType.AssetLiquidation) {
          return nextState;
        }
        nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
          ...player,
          inJail: false,
          jailTurnsServed: 0,
        }));
        nextState = movePlayerTo(
          nextState,
          activePlayer.id,
          (JAIL_POSITION + dieOne + dieTwo) % nextState.board.length,
          true,
          MoveDirection.Forward
        );
        nextState = resolveCurrentSpace(nextState, activePlayer.id, false);
      } else {
        nextState = {
          ...nextState,
          pendingDecision: { type: PendingDecisionType.None },
          turn: {
            ...nextState.turn,
            phase: TurnPhase.TurnComplete,
            reason: null,
          },
        };
      }
    }
    return nextState;
  },
};
