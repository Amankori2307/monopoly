import { CORNER_POSITIONS } from '../../../domain/constants/game.constants';
import { SpaceKind } from '../../../domain/types/game.enums';
import type {
  BoardSpace,
  PlayerState,
  ThemeToken,
} from '../../../domain/types/game.interfaces';
import { boardIndexToGridPosition } from '../../../domain/board/boardLayout.utils';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { getCornerIcon, getSpaceIcon } from '../spaceIcons.constants';

interface BoardSpaceCellProps {
  space: BoardSpace;
  playersOnSpace: PlayerState[];
  findToken: (tokenId: string) => ThemeToken | undefined;
  onSelect: (spaceId: string) => void;
}

/**
 * One square of the board.
 *
 * Row template note: only street spaces render a colour bar, so only they carry
 * the three-row template (see components/_board.scss). Adding a child here means
 * updating that template.
 */
export function BoardSpaceCell({
  space,
  playersOnSpace,
  findToken,
  onSelect,
}: BoardSpaceCellProps) {
  const position = boardIndexToGridPosition(space.index);
  const cornerIcon = getCornerIcon(space);
  const spaceIcon = getSpaceIcon(space);
  const isCorner = CORNER_POSITIONS.includes(space.index as never);
  const isOccupied = playersOnSpace.length > 0;

  const className = [
    'board-space',
    `space-${space.kind}`,
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

      <div>
        <div className="space-players">
          {playersOnSpace.map((player) => (
            <span
              className="token-chip"
              data-testid={TEST_IDS.spacePlayerToken}
              key={player.id}
              title={player.name}
            >
              {findToken(player.tokenId)?.emoji ?? player.name.charAt(0)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
