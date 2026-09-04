/**
 * The pieces that stand on a street's colour ribbon.
 *
 * Drawn rather than styled, for three reasons. A CSS box cannot have a pitched
 * roof, and the roof is what says "house" at eight pixels. `clip-path` can cut
 * the silhouette but strips the outline with it - both the border and any
 * box-shadow - and that dark edge is the only thing keeping a green house
 * legible on a green ribbon. And an SVG `rx` is not a `border-radius`, so the
 * pieces can carry real geometry without touching the sharp-corner system the
 * whole design rests on (see MortgageStamp, which already ships rounded rects).
 *
 * Colour comes from the theme in every case - the faces, the roofs and the
 * outline are all tokens.
 */

interface PieceProps {
  /** The contract class the board and its tests query by. */
  className: string;
}

interface HotelPieceProps extends PieceProps {
  /**
   * True on the left and right columns, where the ribbon runs vertically.
   *
   * A second drawing rather than a CSS rotation: a rotation happens after
   * layout and would lay the hotel on its side, roof pointing sideways. The
   * mortgage stamp picks its box the same way and for the same reason.
   */
  portrait: boolean;
}

/** The outer wall, drawn as one path so the outline is a single unbroken edge. */
const HOUSE_BODY = 'M0.4 4.4 L5 0.7 L9.6 4.4 L9.6 9.3 L0.4 9.3 Z';
const HOUSE_ROOF = 'M0.4 4.4 L5 0.7 L9.6 4.4 Z';

export function HousePiece({ className }: PieceProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 10 10"
    >
      {/* Body first, roof over it: stroking both would double the line along
          the eaves, which at this size reads as a smudge rather than an edge. */}
      <path
        d={HOUSE_BODY}
        fill="var(--building-house)"
        stroke="var(--piece-outline)"
        strokeLinejoin="round"
        strokeWidth="0.9"
      />
      <path d={HOUSE_ROOF} fill="var(--building-house-roof)" />
    </svg>
  );
}

/**
 * Windows are what separate a hotel from a wide house at this size - the roof
 * pitch alone is too shallow to read once the shape is stretched.
 */
const LANDSCAPE_WINDOWS = [3, 8, 13];
const PORTRAIT_WINDOWS = [
  [2.6, 6.4],
  [2.6, 10.4],
  [5.9, 6.4],
  [5.9, 10.4],
];

export function HotelPiece({ className, portrait }: HotelPieceProps) {
  const body = portrait
    ? 'M0.4 5.2 L5 0.7 L9.6 5.2 L9.6 17.3 L0.4 17.3 Z'
    : 'M0.4 3.8 L9 0.7 L17.6 3.8 L17.6 9.3 L0.4 9.3 Z';
  const roof = portrait ? 'M0.4 5.2 L5 0.7 L9.6 5.2 Z' : 'M0.4 3.8 L9 0.7 L17.6 3.8 Z';

  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox={portrait ? '0 0 10 18' : '0 0 18 10'}
    >
      <path
        d={body}
        fill="var(--building-hotel)"
        stroke="var(--piece-outline)"
        strokeLinejoin="round"
        strokeWidth="0.9"
      />
      <path d={roof} fill="var(--building-hotel-roof)" />
      {/* Hidden at the tablet breakpoint, where a 1.7-unit window is under one
          device pixel and turns the whole face to mush. */}
      <g className="building-hotel-windows" fill="var(--building-window)">
        {portrait
          ? PORTRAIT_WINDOWS.map(([x, y]) => (
              <rect height="2.4" key={`${x}-${y}`} width="1.5" x={x} y={y} />
            ))
          : LANDSCAPE_WINDOWS.map((x) => (
              <rect height="2.2" key={x} width="1.7" x={x} y="5.4" />
            ))}
      </g>
    </svg>
  );
}
