import type { DeckCard } from '../types/game';

export const chanceCards: DeckCard[] = [
  {
    id: 'chance-advance-go',
    deck: 'chance',
    title: 'Advance to GO',
    description: 'Advance to GO and collect M200.',
    effect: { kind: 'move-to', index: 0, collectGo: true },
  },
  {
    id: 'chance-delhi',
    deck: 'chance',
    title: 'Advance to Delhi',
    description: 'Advance to Delhi. Collect M200 if you pass GO.',
    effect: { kind: 'move-to', index: 37, collectGo: true },
  },
  {
    id: 'chance-dividend',
    deck: 'chance',
    title: 'Bank dividend',
    description: 'Bank pays you dividend of M50.',
    effect: { kind: 'collect', amount: 50 },
  },
  {
    id: 'chance-go-to-jail',
    deck: 'chance',
    title: 'Go to Jail',
    description: 'Go directly to Jail.',
    effect: { kind: 'go-to-jail' },
  },
  {
    id: 'chance-back-three',
    deck: 'chance',
    title: 'Go back three spaces',
    description: 'Move back three spaces.',
    effect: { kind: 'move-steps', steps: -3 },
  },
  {
    id: 'chance-building-loan',
    deck: 'chance',
    title: 'Building loan matures',
    description: 'Collect M150.',
    effect: { kind: 'collect', amount: 150 },
  },
  {
    id: 'chance-jail-free',
    deck: 'chance',
    title: 'Get Out of Jail Free',
    description: 'Keep until needed or traded.',
    effect: { kind: 'jail-free' },
  },
  {
    id: 'chance-speed-ticket',
    deck: 'chance',
    title: 'Premium rail ticket',
    description: 'Collect M100.',
    effect: { kind: 'collect', amount: 100 },
  },
];

export const communityChestCards: DeckCard[] = [
  {
    id: 'chest-advance-go',
    deck: 'community-chest',
    title: 'Advance to GO',
    description: 'Advance to GO and collect M200.',
    effect: { kind: 'move-to', index: 0, collectGo: true },
  },
  {
    id: 'chest-bank-error',
    deck: 'community-chest',
    title: 'Bank error in your favor',
    description: 'Collect M200.',
    effect: { kind: 'collect', amount: 200 },
  },
  {
    id: 'chest-doctors-fee',
    deck: 'community-chest',
    title: 'Doctor fee',
    description: 'Pay M50.',
    effect: { kind: 'pay', amount: 50 },
  },
  {
    id: 'chest-jail-free',
    deck: 'community-chest',
    title: 'Get Out of Jail Free',
    description: 'Keep until needed or traded.',
    effect: { kind: 'jail-free' },
  },
  {
    id: 'chest-go-to-jail',
    deck: 'community-chest',
    title: 'Go to Jail',
    description: 'Go directly to Jail.',
    effect: { kind: 'go-to-jail' },
  },
  {
    id: 'chest-holiday-fund',
    deck: 'community-chest',
    title: 'Holiday fund matures',
    description: 'Collect M100.',
    effect: { kind: 'collect', amount: 100 },
  },
  {
    id: 'chest-school-fees',
    deck: 'community-chest',
    title: 'School fees',
    description: 'Pay M50.',
    effect: { kind: 'pay', amount: 50 },
  },
  {
    id: 'chest-grand-opera',
    deck: 'community-chest',
    title: 'Collect from every player',
    description: 'Collect M50 from every player.',
    effect: { kind: 'collect-from-each', amount: 50 },
  },
];
