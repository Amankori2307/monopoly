import { useId } from 'react';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface MortgageStampProps {
  /**
   * `deed` is the full stamp for a title-deed card. The two `space` variants are
   * the same stamp at board scale, and they differ only in which way the word
   * runs: a board square is portrait on the top and bottom rows and landscape on
   * the sides, and the word has to follow the long axis to have room.
   *
   * The rotation is baked into each viewBox rather than applied in CSS, because
   * a CSS rotation happens after layout: `width: 128%` would still resolve
   * against the cell's short side and the word came out half the length it had
   * room for.
   */
  variant: 'deed' | 'space-wide' | 'space-tall';
  /** Overrides the test id, so a board square can scope its own by index. */
  testId?: string;
}

/**
 * The mortgage watermark: a rubber stamp struck across a site.
 *
 * Mortgaging is one of the most consequential states in the game - the site
 * collects no rent - and it used to be almost invisible: a 7px owner dot drawn
 * hollow on the board, and a small dashed pill on the deed. This is deliberately
 * a watermark rather than a badge: low enough opacity that the name and the rent
 * table read straight through it, loud enough that the site is obviously struck.
 *
 * Inline SVG rather than an asset, so it takes its colour from the theme through
 * `currentColor` and scales from a 380px card to a 52px board square without a
 * second file.
 *
 * **The board variant has no wording on purpose.** A square is around 52x89px
 * and already carries the space name and the colour ribbon; the word across it
 * would be a seven-pixel font over existing text. A rotated double rule reads as
 * "stamped" at that size, and cannot be mistaken for the ribbon or a building
 * pip. The grunge filter is dropped there too - it does not read that small, and
 * forty filtered SVGs would be a cost for nothing.
 */
export function MortgageStamp({ variant, testId }: MortgageStampProps) {
  // Two deed cards can be on screen at once - the drawer's featured card and the
  // stack behind it - and a hard-coded filter id would have them collide, so one
  // would render unfiltered. useId is per-instance.
  const filterId = `mortgage-stamp-grunge-${useId()}`;
  const isDeed = variant === 'deed';

  return (
    <span
      // The board frame says nothing a screen reader can use; the deed's stamp
      // is the mortgage notice itself, so it keeps the name and the role.
      aria-hidden={isDeed ? undefined : true}
      aria-label={isDeed ? 'Mortgaged' : undefined}
      // Keyed on deed-or-square, not on the variant: the two square variants
      // differ only in geometry and must share every rule. Interpolating the
      // variant here silently produced `is-space-tall`, and every `.is-space`
      // rule - opacity, clipping, z-index - stopped matching.
      className={`mortgage-stamp ${isDeed ? 'is-deed' : 'is-space'}`}
      data-testid={testId ?? TEST_IDS.deedMortgaged}
      role={isDeed ? 'img' : undefined}
    >
      {isDeed ? (
        <DeedStamp filterId={filterId} />
      ) : (
        <SpaceStamp alongHeight={variant === 'space-tall'} />
      )}
    </span>
  );
}

interface DeedStampProps {
  filterId: string;
}

/**
 * The full stamp: double rule, the word, and a bitten rubber edge.
 *
 * The viewBox is deliberately larger than the frame. Rotating inside an SVG does
 * not enlarge its viewport, so a frame sized to the box has its corners clipped
 * away once turned - which is how the first version lost the top and bottom
 * rules and the leading M. The margin here is what the rotation and the filter's
 * displacement need.
 */
function DeedStamp({ filterId }: DeedStampProps) {
  return (
    <svg
      fill="none"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 320 180"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* The bitten, uneven edge of a real rubber stamp. Turbulence displaces
            the strokes rather than blurring them, so the shapes stay crisp
            where they survive. */}
        <filter id={filterId}>
          <feTurbulence
            baseFrequency="0.62"
            numOctaves="3"
            result="grain"
            seed="7"
            type="fractalNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            scale="3.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      <g filter={`url(#${filterId})`} transform="rotate(-14 160 90)">
        <rect
          height="84"
          rx="4"
          stroke="currentColor"
          strokeWidth="7"
          width="262"
          x="29"
          y="48"
        />
        <rect
          height="64"
          rx="2"
          stroke="currentColor"
          strokeWidth="2.5"
          width="242"
          x="39"
          y="58"
        />
        <text
          dominantBaseline="central"
          fill="currentColor"
          fontFamily="'DM Mono', monospace"
          fontSize="38"
          fontWeight="700"
          letterSpacing="1"
          textAnchor="middle"
          x="160"
          y="91"
        >
          MORTGAGED
        </text>
      </g>
    </svg>
  );
}

/**
 * The board square's stamp: the frame with the word inside it.
 *
 * It carried no wording at first, on my own argument that a ~52x89px square
 * could not hold it. That was wrong twice: the sum was made against the cell's
 * *short* axis, and with a bad character advance. Along the long axis DM Mono
 * advances about 0.6em, so the word at 9px is roughly 54px inside a ~70px axis -
 * and the frame alone read as a stray rectangle rather than as "mortgaged".
 *
 * Below the tablet breakpoint the squares are about 29x49px and the word
 * genuinely cannot be read, so the stylesheet hides it there and the frame plus
 * the hollow owner dot carry the state.
 */
interface SpaceStampProps {
  /** True on the portrait squares, where the word runs down the cell. */
  alongHeight: boolean;
}

function SpaceStamp({ alongHeight }: SpaceStampProps) {
  // One frame, drawn along whichever axis is the long one. The numbers are the
  // same measurements transposed; the angle is the stamp's, either way.
  const box = alongHeight ? { width: 104, height: 200 } : { width: 200, height: 96 };
  const centre = { x: box.width / 2, y: box.height / 2 };
  const angle = alongHeight ? 73 : -17;

  return (
    <svg
      fill="none"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${box.width} ${box.height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform={`rotate(${angle} ${centre.x} ${centre.y})`}>
        <rect
          height="48"
          rx="3"
          stroke="currentColor"
          strokeWidth="6"
          width="176"
          x={centre.x - 88}
          y={centre.y - 24}
        />
        <rect
          height="32"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="2.5"
          width="158"
          x={centre.x - 79}
          y={centre.y - 16}
        />
        {/* Hidden on a phone by the stylesheet, where it cannot be read. */}
        <g className="mortgage-stamp-word">
          <text
            dominantBaseline="central"
            fill="currentColor"
            fontFamily="'DM Mono', monospace"
            fontSize="25"
            fontWeight="700"
            letterSpacing="0.5"
            textAnchor="middle"
            x={centre.x}
            y={centre.y + 1}
          >
            MORTGAGED
          </text>
        </g>
      </g>
    </svg>
  );
}
