import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MortgageChoice } from '../../../../domain/types/game.enums';
import { scopedTestId, TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { TradeResponseDecision } from './TradeResponseDecision';

const incoming = {
  playerName: 'Asha',
  cash: 100,
  siteNames: ['Delhi', 'Agra'],
  jailCards: 0,
  transferFee: 0,
};

const outgoing = {
  playerName: 'Vikram',
  cash: 0,
  siteNames: ['Mumbai'],
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

    const columns = screen.getAllByRole('list');
    expect(screen.getByText('You get')).toBeInTheDocument();
    expect(screen.getByText('You give')).toBeInTheDocument();
    // Delhi is named twice - once in the summary, once in the mortgage choices
    // - so this asserts on the summary column rather than the whole panel.
    expect(columns[0]).toHaveTextContent('Delhi');
    expect(columns[1]).toHaveTextContent('Mumbai');
  });
});
