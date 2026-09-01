import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../../domain/board/indiaEditionBoard';
import { MortgageChoice, SpaceKind } from '../../../../domain/types/game.enums';
import type { StreetSpace } from '../../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { TradeResponseDecision } from './TradeResponseDecision';

/** Real board spaces, because the accept screen shows real title deeds now. */
const streets = indiaEditionBoard.filter(
  (space): space is StreetSpace => space.kind === SpaceKind.Street
);

const deed = (space: StreetSpace, mortgaged = false) => ({
  space,
  ownership: { ownerPlayerId: 'player-1', mortgaged, buildLevel: 0 },
});

const incoming = {
  playerName: 'Asha',
  cash: 100,
  sites: [deed(streets[0]), deed(streets[1], true)],
  jailCards: 0,
  transferFee: 0,
};

const outgoing = {
  playerName: 'Vikram',
  cash: 0,
  sites: [deed(streets[2])],
  jailCards: 1,
  transferFee: 0,
};

const mortgaged = [
  { spaceId: 'agra', name: 'Agra', keepCost: 10, redeemCost: 110 },
  { spaceId: 'delhi', name: 'Delhi', keepCost: 20, redeemCost: 220 },
];

const renderPanel = (sites = mortgaged, onAccept = vi.fn()) => {
  render(
    <TradeResponseDecision
      currencySymbol="₹"
      incoming={incoming}
      incomingMortgaged={sites}
      onAccept={onAccept}
      onReject={vi.fn()}
      outgoing={outgoing}
      recipientName="Vikram"
    />
  );
  return onAccept;
};

/**
 * The printed rule gives the receiver of a mortgaged site a choice: clear the
 * mortgage now, or pay the 10% and take it as it stands.
 */
describe('mortgaged sites in an offer', () => {
  it('defaults to keeping each one mortgaged, the cheaper option', () => {
    renderPanel();

    mortgaged.forEach((site) => {
      expect(
        screen.getByTestId(scopedTestId(TEST_IDS.tradeMortgageKeep, site.spaceId))
      ).toBeChecked();
    });
    // 10 + 20 with both kept.
    expect(screen.getByTestId(TEST_IDS.tradeMortgageTotal)).toHaveTextContent('₹30');
  });

  it('adds up what the chosen options cost', () => {
    renderPanel();

    fireEvent.click(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeMortgageRedeem, 'agra'))
    );

    // 110 to clear Agra, 20 to keep Delhi.
    expect(screen.getByTestId(TEST_IDS.tradeMortgageTotal)).toHaveTextContent('₹130');
  });

  it('sends the choices with the acceptance', () => {
    const onAccept = renderPanel();

    fireEvent.click(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeMortgageRedeem, 'delhi'))
    );
    fireEvent.click(screen.getByTestId(TEST_IDS.tradeAccept));

    expect(onAccept).toHaveBeenCalledWith({ delhi: MortgageChoice.Redeem });
  });

  it('accepts with no choices when nothing is mortgaged', () => {
    const onAccept = renderPanel([]);

    expect(screen.queryByTestId(TEST_IDS.tradeMortgageChoices)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(TEST_IDS.tradeAccept));
    expect(onAccept).toHaveBeenCalledWith({});
  });

  // Each site is its own question, so the radios must not share a group.
  it('keeps the choices independent per site', () => {
    renderPanel();

    fireEvent.click(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeMortgageRedeem, 'agra'))
    );

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeMortgageRedeem, 'agra'))
    ).toBeChecked();
    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeMortgageKeep, 'delhi'))
    ).toBeChecked();
  });
});

describe('the offer summary', () => {
  it('shows both sides from the recipient point of view', () => {
    renderPanel();

    // Each side is a labelled column of deeds now, so the heading is what
    // scopes the assertion rather than the order of the lists.
    expect(screen.getByText('You get')).toBeInTheDocument();
    expect(screen.getByText('You give')).toBeInTheDocument();
    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeDeedStack, 'You get'))
    ).toHaveTextContent(streets[0].name);
    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeDeedStack, 'You give'))
    ).toHaveTextContent(streets[2].name);
  });
});

/**
 * What you are agreeing to, as title deeds.
 *
 * This is the screen where a player commits, and it showed a list of bare names:
 * no colour group, no price, no rent, no buildings, no mortgage. You could take a
 * mortgaged site collecting nothing and nothing on screen said so.
 */
describe('the deal, as deeds', () => {
  it('shows a real title deed for everything moving', () => {
    renderPanel();

    const deeds = screen.getAllByTestId(TEST_IDS.spaceCard);
    expect(deeds).toHaveLength(3);
    expect(screen.getByText(streets[0].name)).toBeInTheDocument();
    expect(screen.getByText(streets[2].name)).toBeInTheDocument();
  });

  it('carries the rent ladder, which is what the deal is judged on', () => {
    renderPanel();

    expect(screen.getAllByText(/Rent schedule/i).length).toBeGreaterThan(0);
  });

  it('strikes an incoming mortgaged site on its own deed', () => {
    renderPanel();

    // One of the three deeds is mortgaged, and it is stamped.
    expect(screen.getAllByTestId(TEST_IDS.deedMortgaged)).toHaveLength(1);
  });

  it('still says what the cash and the jail cards are', () => {
    renderPanel();

    // Scoped: a deed's own numbers can coincide with the cash on offer.
    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeDeedStack, 'You get')).parentElement
    ).toHaveTextContent('₹100');
    expect(screen.getByText(/1 Get Out of Jail Free card/)).toBeInTheDocument();
  });
});
