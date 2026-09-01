import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_JAIL_TURNS } from '../../../domain/constants/game.constants';
import { CardDeck, CardEffectKind } from '../../../domain/types/game.enums';
import type { DeckCard, PlayerState } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { PlayerBadges } from './PlayerBadges';

/** The badge only counts these, so one stub card stands for any of them. */
const JAIL_CARD = {
  id: 'chance-jail-free',
  deck: CardDeck.Chance,
  title: 'Get Out of Jail Free',
  description: 'Keep this card until needed.',
  effect: { kind: CardEffectKind.JailFree },
} as DeckCard;

const makePlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  id: 'player-1',
  name: 'Asha',
  tokenId: 'elephant',
  cash: 1500,
  position: 0,
  inJail: false,
  jailTurnsServed: 0,
  jailFreeCards: [],
  isBankrupt: false,
  bankruptcyRank: null,
  hasPassedGo: false,
  ...overrides,
});

const badge = (id: string) => screen.queryByTestId(`${TEST_IDS.playerBadge}-${id}`);

const renderBadges = (player: PlayerState, mortgagedCount = 0) =>
  render(<PlayerBadges mortgagedCount={mortgagedCount} player={player} />);

describe('PlayerBadges', () => {
  // Badges are for states worth acting on, so an ordinary player shows none.
  it('renders nothing for a player with no notable state', () => {
    const { container } = renderBadges(makePlayer());

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a held Get Out of Jail Free card', () => {
    renderBadges(makePlayer({ jailFreeCards: [JAIL_CARD] }));

    expect(badge('jail-free')).toHaveTextContent('Jail card');
  });

  it('counts multiple jail cards', () => {
    renderBadges(makePlayer({ jailFreeCards: [JAIL_CARD, JAIL_CARD] }));

    expect(badge('jail-free')).toHaveTextContent('Jail card x2');
  });

  it('shows jail progress out of the maximum', () => {
    renderBadges(makePlayer({ inJail: true, jailTurnsServed: 2 }));

    expect(badge('jail')).toHaveTextContent(`In jail 2/${MAX_JAIL_TURNS}`);
  });

  it('shows bankruptcy', () => {
    renderBadges(makePlayer({ isBankrupt: true }));

    expect(badge('bankrupt')).toBeInTheDocument();
  });

  // Mortgage state is derived from ownership, not carried on the player, so the
  // badge only appears when the caller supplies a count.
  it('shows a mortgaged badge only when sites are mortgaged', () => {
    renderBadges(makePlayer(), 0);
    expect(badge('mortgaged')).not.toBeInTheDocument();
  });

  it('counts mortgaged sites in the badge', () => {
    renderBadges(makePlayer(), 1);
    expect(badge('mortgaged')).toHaveTextContent('1 mortgaged');
  });

  it('pluralises more than one mortgaged site', () => {
    renderBadges(makePlayer(), 3);
    expect(badge('mortgaged')).toHaveTextContent('3 mortgaged');
  });

  it('shows every applicable badge at once', () => {
    renderBadges(
      makePlayer({ inJail: true, jailTurnsServed: 1, jailFreeCards: [JAIL_CARD] })
    );

    expect(badge('jail')).toBeInTheDocument();
    expect(badge('jail-free')).toBeInTheDocument();
  });
});
