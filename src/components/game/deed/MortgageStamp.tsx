import { useId } from 'react';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface MortgageStampProps {
  /**
   * `deed` is the full stamp with its wording, for a title-deed card. `space` is
   * the frame alone, for a board square - see below for why it carries no text.
   */
  variant: 'deed' | 'space';
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
      className={`mortgage-stamp is-${variant}`}
      data-testid={testId ?? TEST_IDS.deedMortgaged}
      role={isDeed ? 'img' : undefined}
    >
      {isDeed ? <DeedStamp filterId={filterId} /> : <SpaceStamp />}
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
 * The frame alone, on a square viewBox.
 *
 * Square because a board cell is portrait or landscape depending on which side
 * it is on, and the deed's 2.5:1 frame shrank to a small band across the middle
 * of a tall one - a badge rather than a strike. Sized past the cell in CSS and
 * clipped by it, which is how a stamp struck across a square actually looks.
 */
function SpaceStamp() {
  return (
    <svg
      fill="none"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-24 50 50)">
        <rect
          height="60"
          rx="3"
          stroke="currentColor"
          strokeWidth="7"
          width="92"
          x="4"
          y="20"
        />
        <rect
          height="44"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="3"
          width="76"
          x="12"
          y="28"
        />
      </g>
    </svg>
  );
}
