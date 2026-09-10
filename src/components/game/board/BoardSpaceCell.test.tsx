import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import { indiaTheme } from '../../../domain/themes/india.theme';
import {
  HOTEL_BUILD_LEVEL,
  JAIL_POSITION,
} from '../../../domain/constants/game.constants';
import { BoardSide, SpaceKind } from '../../../domain/types/game.enums';
import { getBoardSide } from '../../../domain/board/boardSide.utils';
import type { BoardSpace, StreetSpace } from '../../../domain/types/game.interfaces';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { BoardSpaceCell } from './BoardSpaceCell';
import type { SpaceOwnerMark } from './board.interfaces';

const street = indiaEditionBoard.find(
  (space): space is StreetSpace => space.kind === SpaceKind.Street
) as StreetSpace;

const corner = indiaEditionBoard[0];

const mark = (overrides: Partial<SpaceOwnerMark> = {}): SpaceOwnerMark => ({
  color: '#1466ff',
  mortgaged: false,
  ownerName: 'Asha',
  buildLevel: 0,
  ...overrides,
});

const renderCell = (
  space: BoardSpace = street,
  ownerMark?: SpaceOwnerMark,
  onSelect = vi.fn()
) => {
  render(
    <BoardSpaceCell
      currencySymbol="₹"
      isOccupied={false}
      onSelect={onSelect}
      ownerMark={ownerMark}
      space={space}
      themeId={indiaTheme.id}
    />
  );
  return onSelect;
};

describe('BoardSpaceCell', () => {
  it('names the space for a screen reader', () => {
    renderCell();

    expect(
      screen.getByRole('button', { name: `View details for ${street.name}` })
    ).toBeInTheDocument();
  });

  it('names the owner too, when there is one', () => {
    renderCell(street, mark());

    expect(
      screen.getByRole('button', {
        name: `View details for ${street.name}, owned by Asha`,
      })
    ).toBeInTheDocument();
  });

  it('reports the space that was picked', () => {
    const onSelect = renderCell();

    screen.getByRole('button').click();

    expect(onSelect).toHaveBeenCalledWith(street.id);
  });

  it('gives a street its colour ribbon', () => {
    renderCell();

    expect(screen.getByTestId(TEST_IDS.spaceColorBar)).toHaveClass(
      `group-${street.colorGroup}`
    );
  });

  it('gives a corner no ribbon', () => {
    renderCell(corner);

    expect(screen.queryByTestId(TEST_IDS.spaceColorBar)).not.toBeInTheDocument();
  });

  // Jail is the one corner with interior structure. The other three keep the
  // plain title, so the branch must stay narrow.
  it('gives the Jail square its cell and visiting band', () => {
    renderCell(indiaEditionBoard[JAIL_POSITION]);

    expect(screen.getByTestId(TEST_IDS.jailCell)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.jailVisitingBand)).toBeInTheDocument();
  });

  it('still names the Jail square in full for a screen reader', () => {
    const jail = indiaEditionBoard[JAIL_POSITION];
    renderCell(jail);

    expect(
      screen.getByRole('button', { name: `View details for ${jail.name}` })
    ).toBeInTheDocument();
  });

  it('leaves the other corners on the plain title', () => {
    renderCell(corner);

    expect(screen.queryByTestId(TEST_IDS.jailCell)).not.toBeInTheDocument();
    expect(screen.getByText(corner.name)).toBeInTheDocument();
  });

  // A mortgaged site collects no rent, so its bar fades - but it keeps the
  // owner's colour either way, because the question the bar answers is whose
  // it is. The stamp struck across the square is what says "mortgaged".
  it('fades the owner bar when the site is mortgaged', () => {
    renderCell(street, mark({ mortgaged: true }));

    const bar = screen.getByTestId(scopedTestId(TEST_IDS.spaceOwnerBar, street.index));
    expect(bar).toHaveClass('is-mortgaged');
    expect(bar).toHaveStyle({ backgroundColor: '#1466ff' });
  });

  it('paints the owner bar in their token colour when it is not', () => {
    renderCell(street, mark());

    const bar = screen.getByTestId(scopedTestId(TEST_IDS.spaceOwnerBar, street.index));
    expect(bar).not.toHaveClass('is-mortgaged');
    expect(bar).toHaveStyle({ backgroundColor: '#1466ff' });
  });

  it('shows no owner mark at all on a square nobody owns', () => {
    renderCell(street);

    expect(
      screen.queryByTestId(scopedTestId(TEST_IDS.spaceOwnerBar, street.index))
    ).not.toBeInTheDocument();
  });

  // The wash across the square is the other half of the owner mark. It is a
  // class rather than a bare custom property because CSS cannot ask whether
  // one is set.
  it('marks an owned square so the stylesheet can wash it in the owner colour', () => {
    const { rerender } = render(
      <BoardSpaceCell
        currencySymbol="₹"
        isOccupied={false}
        onSelect={vi.fn()}
        space={street}
        themeId={indiaTheme.id}
      />
    );
    expect(screen.getByRole('button')).not.toHaveClass('is-owned');

    rerender(
      <BoardSpaceCell
        currencySymbol="₹"
        isOccupied={false}
        onSelect={vi.fn()}
        ownerMark={mark()}
        space={street}
        themeId={indiaTheme.id}
      />
    );
    const cell = screen.getByRole('button');
    expect(cell).toHaveClass('is-owned');
    expect(cell.style.getPropertyValue('--space-owner')).toBe('#1466ff');
  });

  // What a square costs is the fact a player scans for, and until now the board
  // never printed it at any size - it was one tap away in the deed, on every
  // viewport.
  describe('the printed amount', () => {
    const priceOn = (space: BoardSpace) => {
      renderCell(space);
      return screen.queryByTestId(scopedTestId(TEST_IDS.spacePrice, space.index));
    };

    it('prints the price of a street in the edition currency', () => {
      expect(priceOn(street)).toHaveTextContent(`₹${street.price}`);
    });

    it('prints the price of a railway and of a utility', () => {
      const railway = indiaEditionBoard.find(
        (space) => space.kind === SpaceKind.Railway
      ) as BoardSpace & { price: number };
      expect(priceOn(railway)).toHaveTextContent(`₹${railway.price}`);
    });

    it('prints what a tax square charges, which is not a price', () => {
      const tax = indiaEditionBoard.find(
        (space) => space.kind === SpaceKind.Tax
      ) as BoardSpace & { amount: number };
      expect(priceOn(tax)).toHaveTextContent(`₹${tax.amount}`);
    });

    it('prints nothing on a square with no fixed amount', () => {
      expect(priceOn(corner)).not.toBeInTheDocument();
      const chance = indiaEditionBoard.find(
        (space) => space.kind === SpaceKind.Chance
      ) as BoardSpace;
      expect(priceOn(chance)).not.toBeInTheDocument();
    });
  });

  // Six squares a board carry a name too long to set in a 30px one. Both are
  // rendered and the board's container query picks: CSS cannot substitute text.
  describe('the short name a small board swaps in', () => {
    it('offers a railway the edition own word for one', () => {
      const railway = indiaEditionBoard.find(
        (space) => space.kind === SpaceKind.Railway
      ) as BoardSpace;
      renderCell(railway);

      // Both in the DOM, so the container query has something to choose.
      expect(screen.getByText(railway.name)).toBeInTheDocument();
      expect(screen.getByText(indiaTheme.nouns.railway)).toBeInTheDocument();
    });

    it('tells the two utilities apart', () => {
      const utilities = indiaEditionBoard.filter(
        (space) => space.kind === SpaceKind.Utility
      );
      const labels = utilities.map((space) => {
        const view = render(
          <BoardSpaceCell
            currencySymbol="₹"
            isOccupied={false}
            onSelect={vi.fn()}
            space={space}
            themeId={indiaTheme.id}
          />
        );
        const short = view.container.querySelector('.space-name-short')?.textContent;
        view.unmount();
        return short;
      });

      expect(new Set(labels).size).toBe(2);
    });

    it('leaves an ordinary street its own name and nothing else', () => {
      renderCell(street);

      expect(screen.getByText(street.name)).toBeInTheDocument();
      expect(document.querySelector('.space-name-short')).toBeNull();
    });
  });

  describe('building pips', () => {
    const pips = () =>
      screen.queryByTestId(scopedTestId(TEST_IDS.spaceBuildings, street.index));

    it('draws nothing on a bare site', () => {
      renderCell(street, mark());

      expect(pips()).not.toBeInTheDocument();
    });

    it('draws one pip per house', () => {
      renderCell(street, mark({ buildLevel: 3 }));

      expect(pips()?.querySelectorAll('.building-house')).toHaveLength(3);
    });

    // A hotel is one wider mark, not five pips: it is not "five houses", and
    // the difference has to read at a glance across forty spaces.
    it('draws a hotel as a single mark', () => {
      renderCell(street, mark({ buildLevel: HOTEL_BUILD_LEVEL }));

      expect(pips()).toHaveClass('has-hotel');
      expect(pips()?.querySelectorAll('.building-hotel')).toHaveLength(1);
      expect(pips()?.querySelectorAll('.building-house')).toHaveLength(0);
    });

    it('draws no pips for an unowned site, whatever its level', () => {
      renderCell(street);

      expect(pips()).not.toBeInTheDocument();
    });

    // Drawn, not styled. A CSS box cannot carry a pitched roof, and a clip-path
    // silhouette loses the outline that keeps a green house legible on a green
    // ribbon - so a regression to boxes is worth failing on.
    it('draws the pieces rather than styling boxes', () => {
      renderCell(street, mark({ buildLevel: 2 }));

      const houses = Array.from(pips()?.querySelectorAll('.building-house') ?? []);
      expect(houses).toHaveLength(2);
      houses.forEach((house) => expect(house.tagName.toLowerCase()).toBe('svg'));
    });

    // The hotel is a second drawing per axis, never a rotation: a rotation
    // happens after layout and would lay the roof on its side.
    it('turns the hotel to face the ribbon it stands on', () => {
      const bottomRow = indiaEditionBoard.find(
        (space): space is StreetSpace =>
          space.kind === SpaceKind.Street &&
          getBoardSide(space.index) === BoardSide.Bottom
      ) as StreetSpace;
      const leftColumn = indiaEditionBoard.find(
        (space): space is StreetSpace =>
          space.kind === SpaceKind.Street && getBoardSide(space.index) === BoardSide.Left
      ) as StreetSpace;

      const hotelOn = (space: StreetSpace) => {
        const view = render(
          <BoardSpaceCell
            currencySymbol="₹"
            isOccupied={false}
            onSelect={vi.fn()}
            ownerMark={mark({ buildLevel: HOTEL_BUILD_LEVEL })}
            space={space}
            themeId={indiaTheme.id}
          />
        );
        const hotel = view.container.querySelector('.building-hotel');
        const box = hotel?.getAttribute('viewBox');
        view.unmount();
        return box;
      };

      // The ribbon runs across a bottom-row cell and down a left-column one.
      expect(hotelOn(bottomRow)).toBe('0 0 18 10');
      expect(hotelOn(leftColumn)).toBe('0 0 10 18');
    });
  });
});

/**
 * The mortgage stamp, struck across the square.
 *
 * The faded owner bar stays - it is the one signal that still reads when the
 * squares shrink to 29px on a phone - but a 7px dot is not something anyone
 * spots across forty squares, which is what the stamp is for.
 */
describe('a mortgaged square', () => {
  const stampId = scopedTestId(TEST_IDS.spaceMortgaged, street.index);

  it('is struck with the stamp', () => {
    renderCell(street, mark({ mortgaged: true }));

    expect(screen.getByTestId(stampId)).toBeInTheDocument();
  });

  it('still shows the space name, because the stamp is a watermark', () => {
    renderCell(street, mark({ mortgaged: true }));

    expect(screen.getByText(street.name)).toBeInTheDocument();
  });

  it('keeps the faded owner bar as well', () => {
    renderCell(street, mark({ mortgaged: true }));

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.spaceOwnerBar, street.index))
    ).toHaveClass('is-mortgaged');
  });

  it('is not struck when the site is owned outright', () => {
    renderCell(street, mark({ mortgaged: false }));

    expect(screen.queryByTestId(stampId)).not.toBeInTheDocument();
  });

  it('is not struck when nobody owns it', () => {
    renderCell(street);

    expect(screen.queryByTestId(stampId)).not.toBeInTheDocument();
  });
});
