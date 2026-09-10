import {
  CORNER_POSITIONS,
  HOTEL_BUILD_LEVEL,
} from '../../../domain/constants/game.constants';
import { BoardSide, SpaceKind } from '../../../domain/types/game.enums';
import type { BoardSpace } from '../../../domain/types/game.interfaces';
import { boardIndexToGridPosition } from '../../../domain/board/boardLayout.utils';
import { getBoardSide } from '../../../domain/board/boardSide.utils';
import { boardPriceOf, boardShortName } from '../../../domain/themes/boardNames.utils';
import { formatMoney } from '../../../shared/utils/money.utils';
import { scopedTestId, TEST_IDS } from '../../../shared/constants/testIds.constants';
import { MortgageStamp } from '../deed/MortgageStamp';
import { HotelPiece, HousePiece } from './BuildingPiece';
import { JailCorner } from './JailCorner';
import { SpaceIcon } from '../icons/SpaceIcon';
import { getCornerIcon, getSpaceIcon } from '../icons/spaceIcon.registry';
import type { SpaceOwnerMark } from './board.interfaces';

/**
 * Whether a square is taller than it is wide, which the two long rows are.
 *
 * Only the mortgage stamp needs to know, so it lives here rather than beside
 * getBoardSide - the sides themselves are about which edge the ribbon hugs.
 */
const isPortraitSide = (side: BoardSide): boolean =>
  side === BoardSide.Bottom || side === BoardSide.Top;

/** The cell's own classes: its kind, its edge, and whether anything is on it. */
const cellClassName = (
  space: BoardSpace,
  side: BoardSide,
  isOccupied: boolean,
  isOwned: boolean
): string =>
  [
    'board-space',
    `space-${space.kind}`,
    `side-${side}`,
    isOccupied ? 'active-space' : '',
    // Carries the owner's wash. A class rather than a bare custom property,
    // because CSS cannot ask whether one is set.
    isOwned ? 'is-owned' : '',
    CORNER_POSITIONS.includes(space.index as never) ? 'corner-space' : '',
  ]
    .filter(Boolean)
    .join(' ');

interface BoardSpaceCellProps {
  /** Prefixes the price. The edition's symbol, never a default. */
  currencySymbol: string;
  /** Whether any token currently sits here - tokens themselves are drawn by
   * BoardTokenLayer, over the board rather than inside the cell. */
  isOccupied: boolean;
  onSelect: (spaceId: string) => void;
  /** Who owns this space, when anyone does. */
  ownerMark?: SpaceOwnerMark;
  space: BoardSpace;
  /** Picks the edition's own word for a railway. See boardNames.utils. */
  themeId: string;
}

/**
 * One square of the board.
 *
 * The `side-*` class decides which edge the colour ribbon hugs: always the cell's
 * short side, on the edge facing the board centre, as on a printed board. Layout
 * per side lives in components/_board.scss.
 */
export function BoardSpaceCell({
  currencySymbol,
  isOccupied,
  onSelect,
  ownerMark,
  space,
  themeId,
}: BoardSpaceCellProps) {
  const side = getBoardSide(space.index);
  const position = boardIndexToGridPosition(space.index);
  const stampTestId = scopedTestId(TEST_IDS.spaceMortgaged, space.index);
  // The top and bottom rows are portrait squares, so the word runs down them -
  // the same way their space names already do.
  const stampVariant = isPortraitSide(side) ? 'space-tall' : 'space-wide';
  const className = cellClassName(space, side, isOccupied, Boolean(ownerMark));

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
      style={{
        gridRow: position.row,
        gridColumn: position.column,
        // The wash the stylesheet mixes down. Inline because a player's token
        // colour is theme DATA, not a CSS token - the same sanctioned
        // exception BoardTokenLayer and PlayerCard already take.
        ...(ownerMark ? { ['--space-owner' as string]: ownerMark.color } : {}),
      }}
      type="button"
    >
      {space.kind === SpaceKind.Street ? (
        <div
          className={`space-color group-${space.colorGroup}`}
          data-testid={TEST_IDS.spaceColorBar}
        >
          {/* Buildings stand on the colour ribbon, as on a printed board: up to
              four houses, or one hotel. */}
          <BuildingPips
            buildLevel={ownerMark?.buildLevel ?? 0}
            isVerticalRibbon={!isPortraitSide(side)}
            spaceIndex={space.index}
          />
        </div>
      ) : null}

      {/* The owner's token colour, run the whole length of the square's outer
          edge, so control of a colour set reads across forty squares rather
          than out of a five-pixel dot. Inline colour is the sanctioned
          exception to the no-hardcoded-colour rule: token colours are theme
          data, not CSS tokens. A mortgaged site fades - it collects no rent -
          and the stamp struck across the square is what says so outright. */}
      {ownerMark ? (
        <span
          className={`space-owner-bar ${ownerMark.mortgaged ? 'is-mortgaged' : ''}`}
          data-testid={scopedTestId(TEST_IDS.spaceOwnerBar, space.index)}
          style={{ backgroundColor: ownerMark.color }}
        />
      ) : null}

      {/* Struck across the square, so a mortgaged site reads at a glance across
          forty of them rather than only from the hollow dot. */}
      {ownerMark?.mortgaged ? (
        <MortgageStamp testId={stampTestId} variant={stampVariant} />
      ) : null}

      {/* Wrapper so the ribbon can sit on any edge while the text keeps the rest. */}
      <div className="space-body">
        <CellBody currencySymbol={currencySymbol} space={space} themeId={themeId} />
      </div>
    </button>
  );
}

/**
 * What a square says: a corner title, a labelled row, or - for Jail alone - two
 * regions of its own.
 *
 * Its own component rather than a chain of ternaries in the cell: three
 * outcomes is where that stops being readable, and the linter agrees.
 */
function CellBody({
  currencySymbol,
  space,
  themeId,
}: {
  currencySymbol: string;
  space: BoardSpace;
  themeId: string;
}) {
  // Jail is the one corner with interior structure, so it owns its markup. Its
  // glyph stays registered for the deed card; the square itself cannot hold
  // bars, a 34px icon and a word at this size.
  if (space.kind === SpaceKind.Jail) {
    return <JailCorner name={space.name} />;
  }

  const cornerIcon = getCornerIcon(space);
  if (cornerIcon) {
    return (
      <div className="corner-title">
        <SpaceIcon className="corner-icon" glyph={cornerIcon} />
        <strong className="space-name">{space.name}</strong>
      </div>
    );
  }

  const spaceIcon = getSpaceIcon(space);
  const price = boardPriceOf(space);
  // Both names render and the board's container query picks one: CSS cannot
  // substitute text, and a JS width check is what this codebase deliberately
  // does not do for layout. Only six squares a board have one at all.
  const shortName = boardShortName(space, themeId);

  return (
    <div className="space-label">
      {spaceIcon ? <SpaceIcon className="space-icon" glyph={spaceIcon} /> : null}
      {/* Two lines across the square's SHORT axis, each running along its long
          one: the name beside the ribbon, the price beyond it, as printed. */}
      <span className="space-text">
        {/* has-short is what the container query keys on: only these six
            squares have a replacement to swap in, and :has() is avoidable
            for one class. */}
        <strong className={`space-name${shortName ? ' has-short' : ''}`}>
          {space.name}
        </strong>
        {shortName ? <strong className="space-name-short">{shortName}</strong> : null}
        {price === null ? null : (
          <span
            className="space-price"
            data-testid={scopedTestId(TEST_IDS.spacePrice, space.index)}
          >
            {formatMoney(price, currencySymbol)}
          </span>
        )}
      </span>
    </div>
  );
}

interface BuildingPipsProps {
  buildLevel: number;
  spaceIndex: number;
  /** The ribbon's axis, which decides the hotel's drawing. See HotelPiece. */
  isVerticalRibbon: boolean;
}

/**
 * Houses and hotels, standing on the colour ribbon.
 *
 * A hotel is one wider piece rather than five houses - it is not "five houses",
 * and the difference has to read at a glance across a 40-space board.
 *
 * The run direction comes from the stylesheet, which already lays the pieces out
 * along whichever axis the ribbon runs. Only the hotel's own drawing depends on
 * the side, and it cannot be a rotation, so it is chosen here.
 */
function BuildingPips({ buildLevel, isVerticalRibbon, spaceIndex }: BuildingPipsProps) {
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
      {isHotel ? (
        <HotelPiece className="building-hotel" portrait={isVerticalRibbon} />
      ) : (
        Array.from({ length: buildLevel }, (_, index) => (
          <HousePiece className="building-house" key={index} />
        ))
      )}
    </span>
  );
}
