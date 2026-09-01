import {
  CardEffectKind,
  GameCommandType,
  MoveDirection,
  PendingDecisionType,
} from '../../../types/game.enums';
import type { DeckCard, GameState } from '../../../types/game.interfaces';
import { rollDie, type RandomSource } from '../../rng';
import { creditFromBank, resolveBankPayment, resolvePlayerPayment } from '../money.utils';
import { movePlayerTo, resolveCurrentSpace, sendPlayerToJail } from '../movement.utils';
import { appendEvents, createEvent, getActivePlayer, updatePlayer } from '../state.utils';
import { resumeTurnAfterDecision } from '../turn.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * Acknowledging a drawn card, and applying what it says.
 *
 * The two are separate on purpose: the draw shows the card and stops, and this
 * is what acts on it. A card that moves the player resolves the space they land
 * on, which can draw another card - so the effect is applied here, where
 * resolveCurrentSpace is reachable, rather than beside the draw.
 */

/**
 * Applies an already-drawn card's effect. Split out of the draw so the UI can
 * interject; everything below this line is the original resolveCard body.
 */
const applyCardEffect = (
  state: GameState,
  card: DeckCard,
  randomSource: RandomSource
): GameState => {
  const activePlayer = getActivePlayer(state);
  let nextState = state;
  const { effect } = card;

  switch (effect.kind) {
    case CardEffectKind.Collect:
      return creditFromBank(nextState, activePlayer.id, effect.amount, card.title);
    case CardEffectKind.Pay:
      return resolveBankPayment(nextState, activePlayer.id, effect.amount, card.title);
    case CardEffectKind.MoveTo: {
      // Every MoveTo card is an "Advance to ...", so the token goes forward -
      // round the whole board if that is what it takes.
      nextState = movePlayerTo(
        nextState,
        activePlayer.id,
        effect.index,
        effect.collectGo,
        MoveDirection.Forward
      );
      // The player did not roll their way here, so a utility's rent is charged
      // on a fresh throw - the printed rule for any card-driven arrival.
      return resolveCurrentSpace(
        nextState,
        activePlayer.id,
        false,
        rollDie(randomSource) + rollDie(randomSource)
      );
    }
    case CardEffectKind.MoveSteps: {
      const destination =
        (activePlayer.position + effect.steps + nextState.board.length) %
        nextState.board.length;
      // A MoveSteps card may go backwards ("go back three spaces"), which is
      // the case the direction argument exists for.
      const direction = effect.steps > 0 ? MoveDirection.Forward : MoveDirection.Backward;
      nextState = movePlayerTo(
        nextState,
        activePlayer.id,
        destination,
        direction === MoveDirection.Forward,
        direction
      );
      return resolveCurrentSpace(
        nextState,
        activePlayer.id,
        false,
        rollDie(randomSource) + rollDie(randomSource)
      );
    }
    case CardEffectKind.GoToJail:
      return sendPlayerToJail(nextState, activePlayer.id, 'Card sent player to Jail');
    case CardEffectKind.JailFree: {
      // The card itself is kept, so it knows the deck it has to go back to.
      const withCard = updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        jailFreeCards: [...player.jailFreeCards, card],
      }));
      return appendEvents(withCard, [
        createEvent(withCard.turnNumber, `${activePlayer.name} kept ${card.title}.`),
      ]);
    }
    case CardEffectKind.CollectFromEach: {
      // Reads nextState, not the incoming state: each payment mutates cash and
      // may raise a liquidation, and the loop used to decide who pays from a
      // snapshot taken before any of it happened.
      nextState.playerOrder
        .filter(
          (playerId) =>
            playerId !== activePlayer.id && !nextState.players[playerId].isBankrupt
        )
        .forEach((playerId) => {
          // Every player is asked, even after one of them could not pay: an
          // unpayable debt queues behind the first rather than overwriting it.
          nextState = resolvePlayerPayment(
            nextState,
            playerId,
            activePlayer.id,
            effect.amount,
            card.title
          );
        });
      return nextState;
    }
    case CardEffectKind.PayEach: {
      nextState.playerOrder
        .filter(
          (playerId) =>
            playerId !== activePlayer.id && !nextState.players[playerId].isBankrupt
        )
        .forEach((playerId) => {
          // One drawer, several payees: each debt they cannot cover queues, so
          // every payee is owed rather than only the first.
          nextState = resolvePlayerPayment(
            nextState,
            activePlayer.id,
            playerId,
            effect.amount,
            card.title
          );
        });
      return nextState;
    }
    default:
      return nextState;
  }
};

export const cardCommands: CommandHandlers = {
  [GameCommandType.AcknowledgeCard]: (state, _command, randomSource) => {
    let nextState = state;
    const decision = nextState.pendingDecision;
    if (decision.type !== PendingDecisionType.CardDraw) {
      throw new Error('There is no drawn card to acknowledge');
    }

    // Clear the decision *before* applying. A MoveTo card routes back through
    // resolveCurrentSpace, which treats any pending decision as blocking - it
    // would read the stale CardDraw and strand the turn.
    nextState = {
      ...nextState,
      pendingDecision: { type: PendingDecisionType.None },
    };
    nextState = applyCardEffect(nextState, decision.card, randomSource);

    // The effect may have raised its own decision - a MoveTo landing on an
    // unowned site, or a payment the player cannot afford. Only settle the
    // phase when it did not. The inJail guard matters because a card can send
    // the player to jail, and a jailed player must not keep an extra roll.
    // A card can send the player to jail, and a jailed player keeps no extra
    // roll - sendPlayerToJail has already ended the turn, so leave it alone.
    if (
      nextState.pendingDecision.type === PendingDecisionType.None &&
      !getActivePlayer(nextState).inJail
    ) {
      nextState = resumeTurnAfterDecision(nextState, randomSource);
    }
    return nextState;
  },
};
