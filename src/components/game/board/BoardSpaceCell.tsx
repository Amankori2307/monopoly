import { CORNER_POSITIONS } from '../../../domain/constants/game.constants';
import { SpaceKind } from '../../../domain/types/game.enums';
import type {
  BoardSpace,
  PlayerState,
  ThemeToken,
} from '../../../domain/types/game.interfaces';
import { boardIndexToGridPosition } from '../../../domain/board/boardLayout.utils';
import { getBoardSide } from '../../../domain/board/boardSide.utils';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { getCornerIcon, getSpaceIcon } from '../spaceIcons.constants';

interface BoardSpaceCellProps {
  /** Whether any token currently sits here - tokens themselves are drawn by
   * BoardTokenLayer, over the board rather than inside the cell. */
  isOccupied: boolean;
  onSelect: (spaceId: string) => void;
  space: BoardSpace;
}

/**
 * One square of the board.
 *
 * The `side-*` class decides which edge the colour ribbon hugs: always the cell's
 * short side, on the edge facing the board centre, as on a printed board. Layout
 * per side lives in components/_board.scss.
 */
export function BoardSpaceCell({ isOccupied, onSelect, space }: BoardSpaceCellProps) {
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
      aria-label={`View details for ${space.name}`}
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
