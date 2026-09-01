import {
  CORNER_POSITIONS,
  HOTEL_BUILD_LEVEL,
} from '../../../domain/constants/game.constants';
import { SpaceKind } from '../../../domain/types/game.enums';
import type { BoardSpace } from '../../../domain/types/game.interfaces';
import { boardIndexToGridPosition } from '../../../domain/board/boardLayout.utils';
import { getBoardSide } from '../../../domain/board/boardSide.utils';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { getCornerIcon, getSpaceIcon } from '../spaceIcons.constants';
import type { SpaceOwnerMark } from './board.interfaces';

interface BoardSpaceCellProps {
  /** Whether any token currently sits here - tokens themselves are drawn by
   * BoardTokenLayer, over the board rather than inside the cell. */
  isOccupied: boolean;
  onSelect: (spaceId: string) => void;
  /** Who owns this space, when anyone does. */
  ownerMark?: SpaceOwnerMark;
  space: BoardSpace;
}

/**
 * One square of the board.
 *
 * The `side-*` class decides which edge the colour ribbon hugs: always the cell's
 * short side, on the edge facing the board centre, as on a printed board. Layout
 * per side lives in components/_board.scss.
 */
export function BoardSpaceCell({
  isOccupied,
  onSelect,
  ownerMark,
  space,
}: BoardSpaceCellProps) {
  const position = boardIndexToGridPosition(space.index);
  const cornerIcon = getCornerIcon(space);
  const spaceIcon = getSpaceIcon(space);
  const isCorner = CORNER_POSITIONS.includes(space.index as never);

  const className = [
    'board-space',
    `space-${space.kind}`,
    `side-${getBoardSide(space.index)}`,
    isOccupied ? 'active-space' : '',
    isCorner ? 'corner-space' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      aria-label={
        ownerMark
          ? `View details for ${space.name}, owned by ${ownerMark.ownerName}`
          : `View details for ${space.name}`
      }
      className={className}
      data-testid={scopedTestId(TEST_IDS.boardSpace, space.index)}
      onClick={() => onSelect(space.id)}
      style={{ gridRow: position.row, gridColumn: position.column }}
      type="button"
    >
      {space.kind === SpaceKind.Street ? (
        <div
          className={`space-color group-${space.colorGroup}`}
          data-testid={TEST_IDS.spaceColorBar}
        >
          {/* Buildings ride the colour ribbon, as on a printed board: up to
              four house pips, or one wider mark for a hotel. */}
          <BuildingPips
            buildLevel={ownerMark?.buildLevel ?? 0}
            spaceIndex={space.index}
          />
        </div>
      ) : null}

      {/* The owner's token colour, so control of a colour set reads off the
          board. Inline colour is the sanctioned exception to the no-hardcoded-
          colour rule: token colours are theme data, not CSS tokens. A mortgaged
          site is hollow - it collects no rent. */}
      {ownerMark ? (
        <span
          className={`space-owner-dot ${ownerMark.mortgaged ? 'is-mortgaged' : ''}`}
          data-testid={scopedTestId(TEST_IDS.spaceOwnerDot, space.index)}
          style={
            ownerMark.mortgaged
              ? { borderColor: ownerMark.color }
              : { backgroundColor: ownerMark.color }
          }
        />
      ) : null}

      {/* Wrapper so the ribbon can sit on any edge while the text keeps the rest. */}
      <div className="space-body">
        {cornerIcon ? (
          <div className="corner-title">
            <img alt="" aria-hidden="true" src={cornerIcon} />
            <strong className="space-name">{space.name}</strong>
          </div>
        ) : (
          <div className="space-label">
            {spaceIcon ? (
              <img alt="" aria-hidden="true" className="space-icon" src={spaceIcon} />
            ) : null}
            <strong className="space-name">{space.name}</strong>
          </div>
        )}
      </div>
    </button>
  );
}

interface BuildingPipsProps {
  buildLevel: number;
  spaceIndex: number;
}

/**
 * Houses and hotels, drawn on the colour ribbon.
 *
 * A hotel is one wider mark rather than five pips - it is not "five houses",
 * and the difference has to read at a glance across a 40-space board.
 */
function BuildingPips({ buildLevel, spaceIndex }: BuildingPipsProps) {
  if (buildLevel === 0) {
    return null;
  }

  const isHotel = buildLevel === HOTEL_BUILD_LEVEL;

  return (
    <span
      aria-hidden="true"
      className={`space-buildings ${isHotel ? 'has-hotel' : ''}`}
      data-testid={scopedTestId(TEST_IDS.spaceBuildings, spaceIndex)}
    >
      {Array.from({ length: isHotel ? 1 : buildLevel }, (_, index) => (
        <span className={isHotel ? 'building-hotel' : 'building-house'} key={index} />
      ))}
    </span>
  );
}
