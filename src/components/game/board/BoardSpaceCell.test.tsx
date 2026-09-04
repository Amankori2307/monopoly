import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import { HOTEL_BUILD_LEVEL } from '../../../domain/constants/game.constants';
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
      isOccupied={false}
      onSelect={onSelect}
      ownerMark={ownerMark}
      space={space}
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

  // A mortgaged site collects no rent, so its dot is hollow - the colour is
  // spent on identifying the owner either way.
  it('hollows out the owner dot when the site is mortgaged', () => {
    renderCell(street, mark({ mortgaged: true }));

    const dot = screen.getByTestId(scopedTestId(TEST_IDS.spaceOwnerDot, street.index));
    expect(dot).toHaveClass('is-mortgaged');
    expect(dot).toHaveStyle({ borderColor: '#1466ff' });
  });

  it('fills the owner dot when it is not', () => {
    renderCell(street, mark());

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.spaceOwnerDot, street.index))
    ).toHaveStyle({ backgroundColor: '#1466ff' });
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
            isOccupied={false}
            onSelect={vi.fn()}
            ownerMark={mark({ buildLevel: HOTEL_BUILD_LEVEL })}
            space={space}
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
 * The hollow owner dot stays - it is the one signal that still reads when the
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

  it('keeps the hollow owner dot as well', () => {
    renderCell(street, mark({ mortgaged: true }));

    expect(
      screen.getByTestId(scopedTestId(TEST_IDS.spaceOwnerDot, street.index))
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
