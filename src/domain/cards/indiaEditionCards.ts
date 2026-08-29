import { CardDeck, CardEffectKind } from '../types/game.enums';
import type { DeckCard } from '../types/game.interfaces';

export const chanceCards: DeckCard[] = [
  {
    id: 'chance-advance-go',
    deck: CardDeck.Chance,
    title: 'Advance to GO',
    description: 'Advance to GO and collect M200.',
    effect: { kind: CardEffectKind.MoveTo, index: 0, collectGo: true },
  },
  {
    id: 'chance-delhi',
    deck: CardDeck.Chance,
    title: 'Advance to Delhi',
    description: 'Advance to Delhi. Collect M200 if you pass GO.',
    effect: { kind: CardEffectKind.MoveTo, index: 37, collectGo: true },
  },
  {
    id: 'chance-dividend',
    deck: CardDeck.Chance,
    title: 'Bank dividend',
    description: 'Bank pays you dividend of M50.',
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
    description: 'Collect M150.',
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
    description: 'Collect M100.',
    effect: { kind: CardEffectKind.Collect, amount: 100 },
  },
];

export const communityChestCards: DeckCard[] = [
  {
    id: 'chest-advance-go',
    deck: CardDeck.CommunityChest,
    title: 'Advance to GO',
    description: 'Advance to GO and collect M200.',
    effect: { kind: CardEffectKind.MoveTo, index: 0, collectGo: true },
  },
  {
    id: 'chest-bank-error',
    deck: CardDeck.CommunityChest,
    title: 'Bank error in your favor',
    description: 'Collect M200.',
    effect: { kind: CardEffectKind.Collect, amount: 200 },
  },
  {
    id: 'chest-doctors-fee',
    deck: CardDeck.CommunityChest,
    title: 'Doctor fee',
    description: 'Pay M50.',
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
    description: 'Collect M100.',
    effect: { kind: CardEffectKind.Collect, amount: 100 },
  },
  {
    id: 'chest-school-fees',
    deck: CardDeck.CommunityChest,
    title: 'School fees',
    description: 'Pay M50.',
    effect: { kind: CardEffectKind.Pay, amount: 50 },
  },
  {
    id: 'chest-grand-opera',
    deck: CardDeck.CommunityChest,
    title: 'Collect from every player',
    description: 'Collect M50 from every player.',
    effect: { kind: CardEffectKind.CollectFromEach, amount: 50 },
  },
];
