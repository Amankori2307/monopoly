import { DEFAULT_CURRENCY_SYMBOL } from '../constants/game.constants';
import { CardDeck, CardEffectKind } from '../types/game.enums';
import type { DeckCard } from '../types/game.interfaces';

/**
 * Card copy is persisted inside GameState.decks, so a description has to be a
 * plain string rather than a function of the active theme. The amount in each
 * `effect` is what the engine acts on; this text only has to agree with it.
 */
const money = (amount: number) => `${DEFAULT_CURRENCY_SYMBOL}${amount}`;

export const chanceCards: DeckCard[] = [
  {
    id: 'chance-advance-go',
    deck: CardDeck.Chance,
    title: 'Advance to GO',
    description: `Advance to GO and collect ${money(200)}.`,
    effect: { kind: CardEffectKind.MoveTo, index: 0, collectGo: true },
  },
  {
    id: 'chance-delhi',
    deck: CardDeck.Chance,
    title: 'Advance to Delhi',
    description: `Advance to Delhi. Collect ${money(200)} if you pass GO.`,
    effect: { kind: CardEffectKind.MoveTo, index: 37, collectGo: true },
  },
  {
    id: 'chance-dividend',
    deck: CardDeck.Chance,
    title: 'Bank dividend',
    description: `Bank pays you dividend of ${money(50)}.`,
    effect: { kind: CardEffectKind.Collect, amount: 50 },
  },
  {
    id: 'chance-go-to-jail',
    deck: CardDeck.Chance,
    title: 'Go to Jail',
    description: 'Go directly to Jail.',
    effect: { kind: CardEffectKind.GoToJail },
  },
  {
    id: 'chance-back-three',
    deck: CardDeck.Chance,
    title: 'Go back three spaces',
    description: 'Move back three spaces.',
    effect: { kind: CardEffectKind.MoveSteps, steps: -3 },
  },
  {
    id: 'chance-building-loan',
    deck: CardDeck.Chance,
    title: 'Building loan matures',
    description: `Collect ${money(150)}.`,
    effect: { kind: CardEffectKind.Collect, amount: 150 },
  },
  {
    id: 'chance-jail-free',
    deck: CardDeck.Chance,
    title: 'Get Out of Jail Free',
    description: 'Keep until needed or traded.',
    effect: { kind: CardEffectKind.JailFree },
  },
  {
    id: 'chance-speed-ticket',
    deck: CardDeck.Chance,
    title: 'Premium rail ticket',
    description: `Collect ${money(100)}.`,
    effect: { kind: CardEffectKind.Collect, amount: 100 },
  },
];

export const communityChestCards: DeckCard[] = [
  {
    id: 'chest-advance-go',
    deck: CardDeck.CommunityChest,
    title: 'Advance to GO',
    description: `Advance to GO and collect ${money(200)}.`,
    effect: { kind: CardEffectKind.MoveTo, index: 0, collectGo: true },
  },
  {
    id: 'chest-bank-error',
    deck: CardDeck.CommunityChest,
    title: 'Bank error in your favor',
    description: `Collect ${money(200)}.`,
    effect: { kind: CardEffectKind.Collect, amount: 200 },
  },
  {
    id: 'chest-doctors-fee',
    deck: CardDeck.CommunityChest,
    title: 'Doctor fee',
    description: `Pay ${money(50)}.`,
    effect: { kind: CardEffectKind.Pay, amount: 50 },
  },
  {
    id: 'chest-jail-free',
    deck: CardDeck.CommunityChest,
    title: 'Get Out of Jail Free',
    description: 'Keep until needed or traded.',
    effect: { kind: CardEffectKind.JailFree },
  },
  {
    id: 'chest-go-to-jail',
    deck: CardDeck.CommunityChest,
    title: 'Go to Jail',
    description: 'Go directly to Jail.',
    effect: { kind: CardEffectKind.GoToJail },
  },
  {
    id: 'chest-holiday-fund',
    deck: CardDeck.CommunityChest,
    title: 'Holiday fund matures',
    description: `Collect ${money(100)}.`,
    effect: { kind: CardEffectKind.Collect, amount: 100 },
  },
  {
    id: 'chest-school-fees',
    deck: CardDeck.CommunityChest,
    title: 'School fees',
    description: `Pay ${money(50)}.`,
    effect: { kind: CardEffectKind.Pay, amount: 50 },
  },
  {
    id: 'chest-grand-opera',
    deck: CardDeck.CommunityChest,
    title: 'Collect from every player',
    description: `Collect ${money(50)} from every player.`,
    effect: { kind: CardEffectKind.CollectFromEach, amount: 50 },
  },
];
