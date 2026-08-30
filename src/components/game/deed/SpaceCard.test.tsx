import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import { isOwnableSpace } from '../../../domain/rules/space.utils';
import { SpaceKind } from '../../../domain/types/game.enums';
import type { BoardSpace, StreetSpace } from '../../../domain/types/game.interfaces';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';
import { SpaceCard } from './SpaceCard';

const findSpace = (kind: SpaceKind): BoardSpace => {
  const space = indiaEditionBoard.find((candidate) => candidate.kind === kind);
  if (!space) {
    throw new Error(`No ${kind} space on the board`);
  }
  return space;
};

const renderCard = (space: BoardSpace) => {
  render(<SpaceCard currencySymbol="M" space={space} />);
  return screen.getByTestId(TEST_IDS.spaceCard);
};

describe('SpaceCard', () => {
  // The card carries its own surface so it measures the same wherever it is
  // used - the modal, the buy decision, and the holdings drawer all get one
  // object rather than each dressing a bare column their own way.
  it('supplies its own card shell', () => {
    expect(renderCard(findSpace(SpaceKind.Street))).toHaveClass('deed-card');
  });

  // is-deed pins the house/hotel footer to the bottom of the shared height. It
  // is not what sets that height - every card gets it, deed or not.
  it.each([SpaceKind.Street, SpaceKind.Railway, SpaceKind.Utility])(
    'marks a %s as a deed so its footer pins to the bottom',
    (kind) => {
      expect(renderCard(findSpace(kind))).toHaveClass('is-deed');
    }
  );

  it('does not mark a space nobody can own as a deed', () => {
    const space = findSpace(SpaceKind.Chance);
    expect(isOwnableSpace(space)).toBe(false);
    const card = renderCard(space);
    expect(card).not.toHaveClass('is-deed');
    // ...but it is still the same card shell, so it still measures the same.
    expect(card).toHaveClass('deed-card');
  });

  // The strip is the card's top edge now, not a street-deed detail, so the card
  // owns it - that is what lets a railway have one at all.
  it('renders the colour strip as its own first child', () => {
    const card = renderCard(findSpace(SpaceKind.Street));
    const band = card.querySelector(`[data-testid="${TEST_IDS.deedBand}"]`);

    expect(band).not.toBeNull();
    expect(card.firstElementChild).toBe(band);
  });

  it('gives a street the strip for its colour group', () => {
    const street = findSpace(SpaceKind.Street) as StreetSpace;
    const card = renderCard(street);

    const band = card.querySelector(`[data-testid="${TEST_IDS.deedBand}"]`);
    expect(band).toHaveClass(`group-${street.colorGroup}`);
    // Themed via the class, never an inline hex, or the strip stops following
    // the active theme.
    expect(band?.getAttribute('style')).toBeNull();
  });

  // --accent sits within a few points of --group-red, so a railway tinted with
  // it would have read as a red street. Ink is distinct from all eight groups.
  it.each([SpaceKind.Railway, SpaceKind.Utility])(
    'gives a %s the ink strip rather than a colour group',
    (kind) => {
      const band = renderCard(findSpace(kind)).querySelector(
        `[data-testid="${TEST_IDS.deedBand}"]`
      );

      expect(band).toHaveClass('is-ink');
      expect(band?.className).not.toMatch(/group-/);
    }
  );

  it('renders no strip for a space nobody can own', () => {
    const card = renderCard(findSpace(SpaceKind.Chance));

    expect(card.querySelector(`[data-testid="${TEST_IDS.deedBand}"]`)).toBeNull();
  });

  // Railways and utilities are bought, mortgaged, and collect rent, so calling
  // them a plain board space read as wrong in the holdings deck.
  it.each([SpaceKind.Street, SpaceKind.Railway, SpaceKind.Utility])(
    'labels a %s as a title deed',
    (kind) => {
      renderCard(findSpace(kind));
      expect(screen.getByText('Title deed')).toBeInTheDocument();
    }
  );

  it('labels a space nobody can own as a board space', () => {
    renderCard(findSpace(SpaceKind.Chance));
    expect(screen.getByText('Board space')).toBeInTheDocument();
  });

  it('renders actions only when the caller supplies them', () => {
    const street = findSpace(SpaceKind.Street);
    const { rerender, container } = render(
      <SpaceCard currencySymbol="M" space={street} />
    );
    expect(container.querySelector('.space-card-actions')).toBeNull();

    rerender(
      <SpaceCard actions={<button type="button">Buy</button>} currencySymbol="M" space={street} />
    );
    expect(screen.getByRole('button', { name: 'Buy' })).toBeInTheDocument();
  });
});
