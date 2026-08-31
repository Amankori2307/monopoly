import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEST_IDS } from '../../../../shared/constants/testIds.constants';
import { CardDrawDecision } from './CardDrawDecision';

const renderCard = (onAcknowledge = vi.fn()) => {
  render(
    <CardDrawDecision
      cardDescription="Collect ₹200."
      cardTitle="Bank error in your favor"
      deckLabel="Community Chest"
      onAcknowledge={onAcknowledge}
      playerName="Asha"
    />
  );
  return onAcknowledge;
};

describe('CardDrawDecision', () => {
  // The card's own words, not a paraphrase - the player is being asked to read
  // it before it acts on them.
  it('shows the deck, the title, and the card text', () => {
    renderCard();

    expect(screen.getByText('Community Chest')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Bank error in your favor' })
    ).toBeInTheDocument();
    expect(screen.getByText('Collect ₹200.')).toBeInTheDocument();
  });

  it('says who drew it, since holdings are public', () => {
    renderCard();

    expect(screen.getByText('Asha drew this card.')).toBeInTheDocument();
  });

  it('acknowledges once per click', () => {
    const onAcknowledge = renderCard();

    fireEvent.click(screen.getByTestId(TEST_IDS.acknowledgeCardButton));

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('offers a single control, so there is no way to skip the card', () => {
    renderCard();

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
