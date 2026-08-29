import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_JAIL_TURNS } from '../../../domain/constants/game.constants';
import type { PlayerState } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { PlayerBadges } from './PlayerBadges';

const makePlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  id: 'player-1',
  name: 'Asha',
  tokenId: 'elephant',
  cash: 1500,
  position: 0,
  inJail: false,
  jailTurnsServed: 0,
  jailFreeCards: 0,
  isBankrupt: false,
  bankruptcyRank: null,
  ...overrides,
});

const badge = (id: string) => screen.queryByTestId(`${TEST_IDS.playerBadge}-${id}`);

describe('PlayerBadges', () => {
  // Badges are for states worth acting on, so an ordinary player shows none.
  it('renders nothing for a player with no notable state', () => {
    const { container } = render(<PlayerBadges player={makePlayer()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a held Get Out of Jail Free card', () => {
    render(<PlayerBadges player={makePlayer({ jailFreeCards: 1 })} />);

    expect(badge('jail-free')).toHaveTextContent('Jail card');
  });

  it('counts multiple jail cards', () => {
    render(<PlayerBadges player={makePlayer({ jailFreeCards: 2 })} />);

    expect(badge('jail-free')).toHaveTextContent('Jail card x2');
  });

  it('shows jail progress out of the maximum', () => {
    render(<PlayerBadges player={makePlayer({ inJail: true, jailTurnsServed: 2 })} />);

    expect(badge('jail')).toHaveTextContent(`In jail 2/${MAX_JAIL_TURNS}`);
  });

  it('shows bankruptcy', () => {
    render(<PlayerBadges player={makePlayer({ isBankrupt: true })} />);

    expect(badge('bankrupt')).toBeInTheDocument();
  });

  it('shows every applicable badge at once', () => {
    render(
      <PlayerBadges
        player={makePlayer({ inJail: true, jailTurnsServed: 1, jailFreeCards: 1 })}
      />
    );

    expect(badge('jail')).toBeInTheDocument();
    expect(badge('jail-free')).toBeInTheDocument();
  });
});
