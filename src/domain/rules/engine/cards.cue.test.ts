import { describe, expect, it } from 'vitest';
import { chanceCards, communityChestCards } from '../../cards/indiaEditionCards';
import { CardDeck, CardEffectKind, GameEventCue } from '../../types/game.enums';
import type { DeckCard } from '../../types/game.interfaces';
import { cueForCard } from './cards.utils';

/**
 * Whether a drawn card helps or hurts, read off its own effect.
 *
 * No new state and no second list to keep in step: the effect is already on the
 * card, so a card's sting cannot disagree with what the card then does.
 */
const card = (effect: DeckCard['effect']): DeckCard => ({
  id: 'test-card',
  deck: CardDeck.Chance,
  title: 'Test card',
  description: 'A card for the test.',
  effect,
});

describe('cueForCard', () => {
  it('reads money coming in as good', () => {
    expect(cueForCard(card({ kind: CardEffectKind.Collect, amount: 50 }))).toBe(
      GameEventCue.CardGood
    );
    expect(cueForCard(card({ kind: CardEffectKind.CollectFromEach, amount: 10 }))).toBe(
      GameEventCue.CardGood
    );
  });

  it('reads money going out as bad', () => {
    expect(cueForCard(card({ kind: CardEffectKind.Pay, amount: 50 }))).toBe(
      GameEventCue.CardBad
    );
    expect(cueForCard(card({ kind: CardEffectKind.PayEach, amount: 10 }))).toBe(
      GameEventCue.CardBad
    );
  });

  it('reads a card out of Jail as good, and one into Jail as bad', () => {
    expect(cueForCard(card({ kind: CardEffectKind.JailFree }))).toBe(
      GameEventCue.CardGood
    );
    expect(cueForCard(card({ kind: CardEffectKind.GoToJail }))).toBe(
      GameEventCue.CardBad
    );
  });

  // Every MoveTo card in the deck is an "Advance to ...".
  it('reads an advance as good', () => {
    expect(
      cueForCard(card({ kind: CardEffectKind.MoveTo, index: 0, collectGo: true }))
    ).toBe(GameEventCue.CardGood);
  });

  it('judges a step move by its direction', () => {
    expect(cueForCard(card({ kind: CardEffectKind.MoveSteps, steps: 3 }))).toBe(
      GameEventCue.CardGood
    );
    expect(cueForCard(card({ kind: CardEffectKind.MoveSteps, steps: -3 }))).toBe(
      GameEventCue.CardBad
    );
  });

  /**
   * Every card in both real decks has to land on one side or the other. A new
   * effect kind that nobody classified would draw in silence, which is the
   * failure this catches.
   */
  it('classifies every card in both decks', () => {
    [...chanceCards, ...communityChestCards].forEach((deckCard) => {
      expect(cueForCard(deckCard), `${deckCard.title} has no cue`).not.toBe(
        GameEventCue.None
      );
    });
  });

  it('covers every effect kind the game has', () => {
    Object.values(CardEffectKind).forEach((kind) => {
      const sample = card({
        kind,
        amount: 10,
        index: 0,
        collectGo: true,
        steps: 1,
      } as never);
      expect(cueForCard(sample), `${kind} has no cue`).not.toBe(GameEventCue.None);
    });
  });
});
