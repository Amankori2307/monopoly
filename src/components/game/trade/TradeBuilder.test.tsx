import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import { CardDeck, CardEffectKind, SpaceKind } from '../../../domain/types/game.enums';
import type { DeckCard, StreetSpace } from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { TradeBuilder } from './TradeBuilder';
import type { TradeBuilderViewModel } from './trade.interfaces';

/** Real board spaces, because the builder renders real title deeds now. */
const streets = indiaEditionBoard.filter(
  (space): space is StreetSpace => space.kind === SpaceKind.Street
);

const owned = (mortgaged = false) => ({
  ownerPlayerId: 'player-1',
  mortgaged,
  buildLevel: 0,
});

const jailCard = (deck: CardDeck, id: string): DeckCard => ({
  id,
  deck,
  title: 'Get Out of Jail Free',
  description: 'Keep this card until needed.',
  effect: { kind: CardEffectKind.JailFree },
});

const builder: TradeBuilderViewModel = {
  proposer: {
    playerId: 'player-1',
    name: 'Asha',
    color: '#1466ff',
    cash: 1500,
    jailFreeCards: [
      jailCard(CardDeck.Chance, 'chance-jail'),
      jailCard(CardDeck.CommunityChest, 'chest-jail'),
    ],
    sites: [
      {
        spaceId: streets[0].id,
        space: streets[0],
        ownership: owned(),
        blockedReason: '',
      },
      {
        spaceId: streets[1].id,
        space: streets[1],
        ownership: owned(),
        blockedReason: 'Sell the buildings in this colour set first',
      },
    ],
  },
  recipient: {
    playerId: 'player-2',
    name: 'Vikram',
    color: '#e01b1b',
    cash: 900,
    jailFreeCards: [],
    sites: [
      {
        spaceId: streets[2].id,
        space: streets[2],
        ownership: owned(true),
        blockedReason: '',
      },
    ],
  },
};

const renderBuilder = (onPropose = vi.fn()) => {
  render(
    <TradeBuilder
      builder={builder}
      currencySymbol="₹"
      onCancel={vi.fn()}
      onPropose={onPropose}
    />
  );
  return onPropose;
};

describe('TradeBuilder', () => {
  it('shows both sides at once', () => {
    renderBuilder();

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeColumn, 'offer'))
    ).toHaveTextContent('Asha');
    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeColumn, 'request'))
    ).toHaveTextContent('Vikram');
  });

  // Any price both players agree on is legal, so the builder must not judge the
  // deal - only refuse one that moves nothing at all.
  it('refuses to send an empty offer', () => {
    renderBuilder();

    expect(screen.getByTestId(TEST_IDS.tradePropose)).toBeDisabled();
  });

  it('sends what was picked on both sides', () => {
    const onPropose = renderBuilder();

    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, streets[0].id)));
    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, streets[2].id)));
    fireEvent.change(screen.getByTestId(scopedTestId(TEST_IDS.tradeCash, 'request')), {
      target: { value: '250' },
    });
    fireEvent.click(screen.getByTestId(TEST_IDS.tradePropose));

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({
        proposerPlayerId: 'player-1',
        recipientPlayerId: 'player-2',
        offeredSpaceIds: [streets[0].id],
        requestedSpaceIds: [streets[2].id],
        requestedCash: 250,
      })
    );
  });

  it('unpicks a site that is picked twice', () => {
    const onPropose = renderBuilder();
    const first = screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, streets[0].id));

    fireEvent.click(first);
    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, streets[2].id)));
    fireEvent.click(first);
    fireEvent.click(screen.getByTestId(TEST_IDS.tradePropose));

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({ offeredSpaceIds: [] })
    );
  });

  // A site whose colour set holds buildings cannot be traded, and the reason
  // belongs on the control rather than in an error after the fact.
  // A site whose colour set holds buildings cannot be traded, and the reason is
  // printed on the card - it used to be a title attribute nobody hovers.
  it('disables a site that cannot be traded, with its reason on the card', () => {
    renderBuilder();

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, streets[1].id))
    ).toBeDisabled();
    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeDeedBlocked, streets[1].id))
    ).toHaveTextContent('Sell the buildings in this colour set first');
  });

  /**
   * The whole point of the rewrite: you can see what you are taking. A mortgaged
   * site is struck with the stamp on its own deed, not annotated in a list.
   */
  it('shows a mortgaged site as a stamped deed', () => {
    renderBuilder();

    const deed = screen.getByTestId(scopedTestId(TEST_IDS.tradeDeed, streets[2].id));
    expect(deed).toHaveTextContent(streets[2].name);
    expect(
      deed.querySelector(`[data-testid="${TEST_IDS.deedMortgaged}"]`)
    ).not.toBeNull();
  });

  it('shows a real title deed for every holding, not a name', () => {
    renderBuilder();

    // The rent ladder is on the card, which is what a trade is judged on.
    const deed = screen.getByTestId(scopedTestId(TEST_IDS.tradeDeed, streets[0].id));
    expect(deed).toHaveTextContent(/Rent schedule/i);
    expect(deed).toHaveTextContent(/Mortgage value/i);
  });

  it('expands a picked deed and leaves the rest as peeks', () => {
    renderBuilder();
    const deed = screen.getByTestId(scopedTestId(TEST_IDS.tradeDeed, streets[0].id));

    expect(deed.className).not.toContain('is-selected');
    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, streets[0].id)));

    expect(deed.className).toContain('is-selected');
  });

  // Only a player who holds one can offer one, so the field is not shown at all
  // to a player with none.
  it('offers jail cards only to a player who holds one', () => {
    renderBuilder();

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeJailCards, 'offer'))
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(scopedTestId(TEST_IDS.tradeJailCards, 'request'))
    ).not.toBeInTheDocument();
  });

  /**
   * The engine moves `jailFreeCards.slice(0, N)`, so clicking a card means "these
   * N go" - not "this one goes". The UI must not imply a per-card choice it
   * cannot honour.
   */
  it('sends the cards up to the one clicked', () => {
    const onPropose = renderBuilder();

    // The second card: both it and the first are in the deal.
    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.tradeJailCard, 'offer-1')));
    fireEvent.click(screen.getByTestId(TEST_IDS.tradePropose));

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({ offeredJailCards: 2 })
    );
  });

  it('takes a card back out when it is clicked again', () => {
    const onPropose = renderBuilder();
    const first = screen.getByTestId(scopedTestId(TEST_IDS.tradeJailCard, 'offer-0'));

    fireEvent.click(first);
    fireEvent.click(first);
    fireEvent.change(screen.getByTestId(scopedTestId(TEST_IDS.tradeCash, 'offer')), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByTestId(TEST_IDS.tradePropose));

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({ offeredJailCards: 0 })
    );
  });

  it('shows each jail card with the deck it must return to', () => {
    renderBuilder();

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeJailCard, 'offer-0'))
    ).toHaveTextContent('Chance');
    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeJailCard, 'offer-1'))
    ).toHaveTextContent('Community Chest');
  });
});
