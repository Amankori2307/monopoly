import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../../domain/board/indiaEditionBoard';
import { isOwnableSpace } from '../../../../domain/rules/space.utils';
import { SpaceKind } from '../../../../domain/types/game.enums';
import type { OwnableSpace, StreetSpace } from '../../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { BuyOrAuctionDecision } from './BuyOrAuctionDecision';

const spaceOfKind = (kind: SpaceKind): OwnableSpace => {
  const space = indiaEditionBoard.find(
    (candidate) => candidate.kind === kind && isOwnableSpace(candidate)
  );
  if (!space || !isOwnableSpace(space)) {
    throw new Error(`No ownable ${kind} on the board`);
  }
  return space;
};

const renderDecision = (
  space: OwnableSpace = spaceOfKind(SpaceKind.Street),
  buyBlockedReason: string | null = null
) => {
  const onBuy = vi.fn();
  const onDecline = vi.fn();
  render(
    <BuyOrAuctionDecision
      buyBlockedReason={buyBlockedReason}
      currencySymbol="M"
      onBuy={onBuy}
      onDecline={onDecline}
      playerName="Asha"
      space={space}
    />
  );
  return { onBuy, onDecline, space };
};

describe('BuyOrAuctionDecision', () => {
  it('names the player and states the choice', () => {
    renderDecision();

    expect(screen.getByText(/Asha landed here/)).toBeInTheDocument();
    expect(screen.getByText(/send it to auction/)).toBeInTheDocument();
  });

  // The card heading is the single place the space is named.
  it('names the space exactly once', () => {
    const { space } = renderDecision();

    expect(screen.getAllByText(space.name)).toHaveLength(1);
    expect(screen.getByRole('heading', { name: space.name })).toBeInTheDocument();
  });

  // The whole point of the change: decide against the full deed, not a bare price.
  it('shows the full title deed, not just a price', () => {
    renderDecision();

    expect(screen.getByTestId(TEST_IDS.spaceCard)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.rentSchedule)).toBeInTheDocument();
    expect(screen.getByText('With whole colour set')).toBeInTheDocument();
    expect(screen.getByText('Mortgage value')).toBeInTheDocument();
  });

  it('puts the price on the buy button', () => {
    const { space } = renderDecision();

    expect(screen.getByTestId(TEST_IDS.buyButton)).toHaveTextContent(
      `Buy for M${space.price}`
    );
  });

  it('renders a railway deed for a railway', () => {
    renderDecision(spaceOfKind(SpaceKind.Railway));

    expect(screen.getByText('Rent by stations owned')).toBeInTheDocument();
  });

  it('renders a utility deed for a utility', () => {
    renderDecision(spaceOfKind(SpaceKind.Utility));

    expect(screen.getByText('Rent is based on the dice roll.')).toBeInTheDocument();
  });

  it('calls onBuy and onDecline', () => {
    const { onBuy, onDecline } = renderDecision();

    fireEvent.click(screen.getByTestId(TEST_IDS.buyButton));
    fireEvent.click(screen.getByTestId(TEST_IDS.declineButton));

    expect(onBuy).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('shows the street colour band', () => {
    const street = spaceOfKind(SpaceKind.Street) as StreetSpace;
    renderDecision(street);

    expect(screen.getByTestId(TEST_IDS.deedBand)).toHaveClass(
      `group-${street.colorGroup}`
    );
  });
});

/**
 * A player who cannot afford the site.
 *
 * Buy used to be live regardless: clicking it threw in the engine, the thunk
 * logged to the console, and the modal stayed up with no way to answer it - the
 * game looked frozen. The button now says no before the command does.
 */
describe('when the player cannot afford it', () => {
  const REASON = 'Not enough cash to buy it';

  it('disables Buy', () => {
    renderDecision(spaceOfKind(SpaceKind.Street), REASON);

    expect(screen.getByTestId(TEST_IDS.buyButton)).toBeDisabled();
  });

  // A disabled button with no explanation reads as a broken game, and a title
  // attribute is neither readable on touch nor reliably announced.
  it('says why, in the panel rather than only in a tooltip', () => {
    renderDecision(spaceOfKind(SpaceKind.Street), REASON);

    expect(screen.getByTestId(TEST_IDS.buyBlockedReason)).toHaveTextContent(REASON);
  });

  it('does not fire the command when the button is clicked anyway', () => {
    const { onBuy } = renderDecision(spaceOfKind(SpaceKind.Street), REASON);

    fireEvent.click(screen.getByTestId(TEST_IDS.buyButton));

    expect(onBuy).not.toHaveBeenCalled();
  });

  // The decision must stay answerable - declining is what the player has left.
  it('leaves the auction available', () => {
    const { onDecline } = renderDecision(spaceOfKind(SpaceKind.Street), REASON);

    expect(screen.getByTestId(TEST_IDS.declineButton)).toBeEnabled();
    fireEvent.click(screen.getByTestId(TEST_IDS.declineButton));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('says nothing, and enables Buy, when the player can afford it', () => {
    renderDecision();

    expect(screen.getByTestId(TEST_IDS.buyButton)).toBeEnabled();
    expect(screen.queryByTestId(TEST_IDS.buyBlockedReason)).not.toBeInTheDocument();
  });
});
