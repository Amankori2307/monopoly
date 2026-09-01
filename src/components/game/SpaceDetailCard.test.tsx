import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../domain/board/indiaEditionBoard';
import {
  GameCommandType,
  PropertyAction,
  SpaceKind,
} from '../../domain/types/game.enums';
import type { BoardSpace, StreetSpace } from '../../domain/types/game.interfaces';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import type { SitePanelViewModel } from './overlays/overlays.interfaces';
import { SpaceDetailCard } from './SpaceDetailCard';

const findSpace = (kind: SpaceKind): BoardSpace => {
  const space = indiaEditionBoard.find((candidate) => candidate.kind === kind);
  if (!space) {
    throw new Error(`No ${kind} space on the board`);
  }
  return space;
};

const baseProps = {
  currencySymbol: '₹',
  onProposeTrade: vi.fn(),
  onPropertyAction: vi.fn(),
};

/** An unowned space, which is the panel's plain-deed state. */
const unownedPanel = (space: BoardSpace | null): SitePanelViewModel => ({
  isOwnedByOpponent: false,
  siteActions: [],
  space,
});

const renderCard = (space: BoardSpace | null, onClose = vi.fn()) => {
  render(
    <SpaceDetailCard {...baseProps} onClose={onClose} panel={unownedPanel(space)} />
  );
  return onClose;
};

describe('SpaceDetailCard', () => {
  it('renders nothing when no space is selected', () => {
    renderCard(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the full rent schedule for a street', () => {
    const street = findSpace(SpaceKind.Street) as StreetSpace;
    renderCard(street);

    expect(screen.getByRole('dialog', { name: street.name })).toBeInTheDocument();
    expect(screen.getByText('Title deed')).toBeInTheDocument();
    expect(screen.getByText('With whole colour set')).toBeInTheDocument();
    expect(screen.getByText('With hotel')).toBeInTheDocument();
  });

  // The colour band must carry the theme-driven group class rather than an inline
  // hex, otherwise the deed stops following the active theme.
  it('applies the themed colour-group class to a street colour band', () => {
    const street = findSpace(SpaceKind.Street) as StreetSpace;
    const { container } = render(
      <SpaceDetailCard {...baseProps} onClose={vi.fn()} panel={unownedPanel(street)} />
    );

    const band = container.querySelector('.deed-band');
    expect(band).toHaveClass(`group-${street.colorGroup}`);
    expect(band?.getAttribute('style')).toBeNull();
  });

  it('describes rent as dice-based for a utility', () => {
    renderCard(findSpace(SpaceKind.Utility));

    expect(screen.getByText('Rent is based on the dice roll.')).toBeInTheDocument();
    expect(screen.getByText('Both utilities owned')).toBeInTheDocument();
  });

  it('closes on the close button', () => {
    const onClose = renderCard(findSpace(SpaceKind.Railway));

    fireEvent.click(screen.getByRole('button', { name: 'Close space details' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape is pressed', () => {
    const onClose = renderCard(findSpace(SpaceKind.Street));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when a click starts inside the card', () => {
    const onClose = renderCard(findSpace(SpaceKind.Street));

    fireEvent.mouseDown(screen.getByRole('dialog'));

    expect(onClose).not.toHaveBeenCalled();
  });

  // Three states, because the useful answer differs by who owns the space.
  describe('ownership states', () => {
    const street = () => findSpace(SpaceKind.Street);

    const ownedPanel = (
      overrides: Partial<SitePanelViewModel> = {}
    ): SitePanelViewModel => ({
      isOwnedByOpponent: false,
      ownerMark: { color: '#1466ff', mortgaged: false, ownerName: 'Asha', buildLevel: 0 },
      ownership: { ownerPlayerId: 'player-1', mortgaged: false, buildLevel: 0 },
      siteActions: [
        {
          action: PropertyAction.Mortgage,
          label: 'Mortgage',
          command: GameCommandType.MortgageAsset,
          isEnabled: false,
          disabledReason: 'Not implemented yet',
        },
      ],
      space: street(),
      ...overrides,
    });

    const renderPanel = (
      panel: SitePanelViewModel,
      overrides: Partial<Parameters<typeof SpaceDetailCard>[0]> = {}
    ) =>
      render(
        <SpaceDetailCard {...baseProps} onClose={vi.fn()} panel={panel} {...overrides} />
      );

    it('shows no action block for a space nobody owns', () => {
      renderPanel(unownedPanel(street()));

      expect(screen.queryByTestId(TEST_IDS.siteActions)).not.toBeInTheDocument();
    });

    it('says you own it, and offers your actions', () => {
      renderPanel(ownedPanel());

      expect(screen.getByTestId(TEST_IDS.siteOwner)).toHaveTextContent(
        'You own this site'
      );
      expect(screen.getByRole('button', { name: 'Mortgage' })).toBeInTheDocument();
    });

    it('names the other player and offers a deal instead', () => {
      renderPanel(
        ownedPanel({
          isOwnedByOpponent: true,
          ownerMark: {
            color: '#e01b1b',
            mortgaged: false,
            ownerName: 'Vikram',
            buildLevel: 0,
          },
          siteActions: [],
        })
      );

      expect(screen.getByTestId(TEST_IDS.siteOwner)).toHaveTextContent('Owned by Vikram');
      expect(screen.getByTestId(TEST_IDS.proposeTradeButton)).toBeInTheDocument();
    });

    // An opponent's site is a trade target, and the deal button is the only way
    // into the offer builder.
    it('offers a deal on an opponent site, and passes the space along', () => {
      const onProposeTrade = vi.fn();
      renderPanel(ownedPanel({ isOwnedByOpponent: true, siteActions: [] }), {
        onProposeTrade,
      });

      const button = screen.getByTestId(TEST_IDS.proposeTradeButton);
      expect(button).toBeEnabled();

      button.click();
      expect(onProposeTrade).toHaveBeenCalledWith(street().id);
    });

    it('stamps a mortgaged deed so it reads as mortgaged everywhere', () => {
      renderPanel(
        ownedPanel({
          ownership: { ownerPlayerId: 'player-1', mortgaged: true, buildLevel: 0 },
        })
      );

      expect(screen.getByTestId(TEST_IDS.deedMortgaged)).toBeInTheDocument();
    });

    it('does not stamp an unmortgaged deed', () => {
      renderPanel(ownedPanel());

      expect(screen.queryByTestId(TEST_IDS.deedMortgaged)).not.toBeInTheDocument();
    });

    it('dispatches the action command with the picked space', () => {
      const onPropertyAction = vi.fn();
      render(
        <SpaceDetailCard
          {...baseProps}
          onClose={vi.fn()}
          onPropertyAction={onPropertyAction}
          panel={ownedPanel({
            siteActions: [
              {
                action: PropertyAction.Mortgage,
                label: 'Mortgage',
                command: GameCommandType.MortgageAsset,
                isEnabled: true,
                disabledReason: '',
              },
            ],
          })}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Mortgage' }));

      expect(onPropertyAction).toHaveBeenCalledWith(
        GameCommandType.MortgageAsset,
        street().id
      );
    });
  });
});
