import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indiaEditionBoard } from '../../../domain/board/indiaEditionBoard';
import { HOTEL_BUILD_LEVEL } from '../../../domain/constants/game.constants';
import { SpaceKind } from '../../../domain/types/game.enums';
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
  });
});
