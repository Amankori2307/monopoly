import {
  CardDeck,
  CardEffectKind,
  DeckName,
  PendingDecisionType,
  TurnPhase,
} from '../../types/game.enums';
import type { DeckCard, GameState } from '../../types/game.interfaces';
import { appendEvents, createEvent, getActivePlayer } from './state.utils';

/**
 * Drawing a card, and putting a jail card back.
 *
 * A drawn card is shown before it acts: the draw raises a decision carrying the
 * card, and the effect is applied when the player acknowledges it. That is why
 * this module knows nothing about effects - applying one needs to resolve a
 * space, and keeping that out of here is what stops the two forming a cycle.
 *
 * Get Out of Jail Free is the one card that leaves its deck when drawn, because
 * a held card is out of play. returnJailCardToDeck is the only thing that puts
 * one back, and without it both would leave circulation for good.
 */

/**
 * Draws the top card and stops. The effect is applied separately, by
 * AcknowledgeCard, so the player reads the card before it acts on them - the
 * two used to happen in one indivisible step, which left no room to show it.
 *
 * The deck is recycled here rather than at apply time: the card has left the
 * deck the moment it is drawn, whether or not the player has clicked yet.
 */
/** Which deck a card belongs to. The two enums use different string values. */
export const deckNameOf = (deck: CardDeck): DeckName =>
  deck === CardDeck.Chance ? DeckName.Chance : DeckName.CommunityChest;

/**
 * Puts a used Get Out of Jail Free card back at the bottom of its own deck.
 *
 * drawCard removes these from their deck rather than recycling them, because a
 * held card is genuinely out of play. This is what returns one.
 */
export const returnJailCardToDeck = (state: GameState, card: DeckCard): GameState => {
  const deckName = deckNameOf(card.deck);
  return {
    ...state,
    decks: { ...state.decks, [deckName]: [...state.decks[deckName], card] },
  };
};

export const drawCard = (state: GameState, deckName: DeckName): GameState => {
  const card = state.decks[deckName][0];
  const remainingCards = state.decks[deckName].slice(1);
  const activePlayer = getActivePlayer(state);
  const nextState: GameState = {
    ...state,
    decks: {
      ...state.decks,
      [deckName]:
        card.effect.kind === CardEffectKind.JailFree
          ? remainingCards
          : [...remainingCards, card],
    },
    pendingDecision: {
      type: PendingDecisionType.CardDraw,
      playerId: activePlayer.id,
      deck: deckName,
      card,
    },
    turn: {
      ...state.turn,
      phase: TurnPhase.AwaitDecision,
      reason: `${activePlayer.name} drew ${card.title}.`,
    },
  };

  return appendEvents(nextState, [
    createEvent(nextState.turnNumber, `${activePlayer.name} drew ${card.title}.`),
  ]);
};
