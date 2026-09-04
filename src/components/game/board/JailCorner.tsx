import type { CSSProperties } from 'react';
import { JAIL_BAND_FRACTION } from '../../../domain/board/boardLayout.utils';
import { TEST_IDS } from '../../../shared/constants/testIds.constants';

interface JailCornerProps {
  /** The space's own name - "Jail / Just Visiting" - split into its two halves. */
  name: string;
}

/**
 * Four bars and two rails, drawn rather than striped with a gradient.
 *
 * A `repeating-linear-gradient` measures its stops in pixels and the square is
 * not a fixed size, so the bar count would change with the screen: three on a
 * phone, nine on a wide monitor. A fixed viewBox keeps it constant, and
 * `currentColor` puts the whole thing on one theme token.
 */
function JailBars() {
  return (
    <svg
      aria-hidden="true"
      className="jail-bars"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 100 100"
    >
      {/* The window starts below the top third, leaving the cell's label a
          clear strip to sit in. Butt caps: the sharp-corner system applies to
          the drawing too. */}
      <g stroke="currentColor" strokeLinecap="butt" strokeWidth="6">
        <line x1="20" x2="20" y1="32" y2="94" />
        <line x1="40" x2="40" y1="32" y2="94" />
        <line x1="60" x2="60" y1="32" y2="94" />
        <line x1="80" x2="80" y1="32" y2="94" />
        <line x1="8" x2="92" y1="38" y2="38" />
        <line x1="8" x2="92" y1="88" y2="88" />
      </g>
    </svg>
  );
}

/**
 * The Jail corner: a barred cell inset towards the board centre, and an L-shaped
 * visiting band along the two outer edges.
 *
 * Tokens are **not** drawn here. `BoardTokenLayer` places every token over the
 * board, and routes the ones on this square by `player.inJail` through the same
 * `JAIL_BAND_FRACTION` this component hands to the stylesheet - which is the
 * point of passing it as a custom property rather than writing 34% in the SCSS.
 * A band the eye sees and a band the maths uses that disagree is the obvious way
 * for this feature to rot.
 */
export function JailCorner({ name }: JailCornerProps) {
  // The board data owns the wording. Splitting it here keeps one source of
  // truth rather than two literals free to drift from indiaEditionBoard.
  const [jailLabel = name, visitingLabel] = name.split(' / ');

  return (
    <div
      className="jail-corner"
      style={{ '--jail-band-size': `${JAIL_BAND_FRACTION * 100}%` } as CSSProperties}
    >
      <div className="corner-title jail-cell" data-testid={TEST_IDS.jailCell}>
        <JailBars />
        <strong className="space-name">{jailLabel}</strong>
      </div>

      {visitingLabel ? (
        <>
          {/* Off-screen, so the square's text still reads as the one name the
              board data gives it. Deliberately not `.space-name`: the clipping
              test measures those, and this one is a 1px box. */}
          <span aria-hidden="true" className="jail-name-joiner">
            {' / '}
          </span>

          <div
            className="corner-title jail-visiting-band"
            data-testid={TEST_IDS.jailVisitingBand}
          >
            <strong className="space-name">{visitingLabel}</strong>
          </div>
        </>
      ) : null}
    </div>
  );
}
