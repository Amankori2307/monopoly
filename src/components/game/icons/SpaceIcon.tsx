import type { SpaceGlyph } from './spaceIcon.interfaces';

interface SpaceIconProps {
  /** The class the board and the deed style and query by. */
  className?: string;
  glyph: SpaceGlyph;
}

/**
 * A board glyph, drawn inline so the theme can reach it.
 *
 * These were `<img src={url}>` until now, which meant their colour was baked
 * into the file: the paths are near-black, and under a dark theme they were
 * near-black on a near-black cell with nothing CSS could do about it. Inline,
 * `fill: currentColor` makes the colour a theme token like everything else -
 * the same move `MortgageStamp` already makes.
 *
 * One wrapper for all eleven, so the fill, the aria attributes and the
 * focusability cannot drift between them.
 */
export function SpaceIcon({ className, glyph }: SpaceIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      // Decorative, and inside a <button>: without this it becomes a tab stop
      // of its own in some browsers.
      focusable="false"
      viewBox={glyph.viewBox}
    >
      <path d={glyph.d} fill="currentColor" />
    </svg>
  );
}
