import { PASS_GO_AMOUNT } from '../constants/game.constants';
import { CardDeck, CardEffectKind } from '../types/game.enums';
import type { DeckCard } from '../types/game.interfaces';
import { GO_INDEX } from './boardLayout.constants';
import type { GameTheme } from './theme.interfaces';

/**
 * The standard sixteen, in this theme's own money and place names.
 *
 * Written out per theme before this, which meant the India deck hardcoded
 * `DEFAULT_CURRENCY_SYMBOL` - so a second edition's cards would have promised
 * "₹200" on a board priced in pounds. The amount in each `effect` is what the
 * engine acts on and the text is only there to agree with it, so the text is
 * the thing that has to be built rather than copied.
 *
 * The **card ids are shared across themes**, deliberately. A card is the same
 * card whatever the board is called, and the ids are what
 * `ruleCoverage.constants` and the drawn-card tests name.
 *
 * A theme wanting its own story supplies `cards` instead - see GameTheme.
 */

/** The deed a "advance to the top blue" card sends you to. */
const PREMIUM_STREET_INDEX = 37;

const buildChance = (theme: GameTheme): DeckCard[] => {
  const money = (amount: number) => `${theme.currencySymbol}${amount}`;
  const premiumStreet = theme.spaceNames[PREMIUM_STREET_INDEX];

  return [
    {
      id: 'chance-advance-go',
      deck: CardDeck.Chance,
      title: 'Advance to GO',
      description: `Advance to GO and collect ${money(PASS_GO_AMOUNT)}.`,
      effect: { kind: CardEffectKind.MoveTo, index: GO_INDEX, collectGo: true },
    },
    {
      id: 'chance-premium-street',
      deck: CardDeck.Chance,
      title: `Advance to ${premiumStreet}`,
      description: `Advance to ${premiumStreet}. Collect ${money(PASS_GO_AMOUNT)} if you pass GO.`,
      effect: {
        kind: CardEffectKind.MoveTo,
        index: PREMIUM_STREET_INDEX,
        collectGo: true,
      },
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
};

const buildCommunityChest = (theme: GameTheme): DeckCard[] => {
  const money = (amount: number) => `${theme.currencySymbol}${amount}`;

  return [
    {
      id: 'chest-advance-go',
      deck: CardDeck.CommunityChest,
      title: 'Advance to GO',
      description: `Advance to GO and collect ${money(PASS_GO_AMOUNT)}.`,
      effect: { kind: CardEffectKind.MoveTo, index: GO_INDEX, collectGo: true },
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
};

export const buildCards = (
  theme: GameTheme
): { chance: DeckCard[]; communityChest: DeckCard[] } =>
  theme.cards ?? {
    chance: buildChance(theme),
    communityChest: buildCommunityChest(theme),
  };
