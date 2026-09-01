import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { TradeBuilder } from './TradeBuilder';
import type { TradeBuilderViewModel } from './trade.interfaces';

const builder: TradeBuilderViewModel = {
  proposer: {
    playerId: 'player-1',
    name: 'Asha',
    color: '#1466ff',
    cash: 1500,
    jailCards: 1,
    sites: [
      { spaceId: 'delhi', name: 'Delhi', mortgaged: false, blockedReason: '' },
      {
        spaceId: 'mumbai',
        name: 'Mumbai',
        mortgaged: false,
        blockedReason: 'Sell the buildings in this colour set first',
      },
    ],
  },
  recipient: {
    playerId: 'player-2',
    name: 'Vikram',
    color: '#e01b1b',
    cash: 900,
    jailCards: 0,
    sites: [{ spaceId: 'agra', name: 'Agra', mortgaged: true, blockedReason: '' }],
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

    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, 'delhi')));
    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, 'agra')));
    fireEvent.change(screen.getByTestId(scopedTestId(TEST_IDS.tradeCash, 'request')), {
      target: { value: '250' },
    });
    fireEvent.click(screen.getByTestId(TEST_IDS.tradePropose));

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({
        proposerPlayerId: 'player-1',
        recipientPlayerId: 'player-2',
        offeredSpaceIds: ['delhi'],
        requestedSpaceIds: ['agra'],
        requestedCash: 250,
      })
    );
  });

  it('unpicks a site that is picked twice', () => {
    const onPropose = renderBuilder();
    const delhi = screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, 'delhi'));

    fireEvent.click(delhi);
    fireEvent.click(screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, 'agra')));
    fireEvent.click(delhi);
    fireEvent.click(screen.getByTestId(TEST_IDS.tradePropose));

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({ offeredSpaceIds: [] })
    );
  });

  // A site whose colour set holds buildings cannot be traded, and the reason
  // belongs on the control rather than in an error after the fact.
  it('disables a site that cannot be traded, with its reason', () => {
    renderBuilder();
    const mumbai = screen.getByTestId(scopedTestId(TEST_IDS.tradeSite, 'mumbai'));

    expect(mumbai).toBeDisabled();
    expect(mumbai.closest('label')).toHaveAttribute(
      'title',
      'Sell the buildings in this colour set first'
    );
  });

  it('marks a mortgaged site so the receiver knows what they are taking', () => {
    renderBuilder();

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.tradeColumn, 'request'))
    ).toHaveTextContent(/Agra \(mortgaged\)/);
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

  it('never offers more jail cards than the player holds', () => {
    const onPropose = renderBuilder();

    fireEvent.change(screen.getByTestId(scopedTestId(TEST_IDS.tradeJailCards, 'offer')), {
      target: { value: '9' },
    });
    fireEvent.click(screen.getByTestId(TEST_IDS.tradePropose));

    expect(onPropose).toHaveBeenCalledWith(
      expect.objectContaining({ offeredJailCards: 1 })
    );
  });
});
