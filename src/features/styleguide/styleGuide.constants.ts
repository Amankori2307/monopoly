/**
 * What the style guide renders.
 *
 * These lists duplicate the Sass scales across a boundary neither side can
 * read - the same situation as `CORNER_TRACK` against `$board-corner-track`,
 * and handled the same way: `styleGuide.guard.test.ts` reads the SCSS and
 * fails when the two disagree. A style guide that quietly stops showing a rung
 * is worse than none, because it looks complete.
 */

/** Every type role, in ramp order. */
export const TEXT_ROLES = [
  'hero',
  'display',
  'title',
  'heading',
  'prose',
  'body',
  'body-sm',
  'small',
  'numeric',
  'mono-sm',
  'brand',
  'eyebrow',
  'label',
  'micro',
  'code',
] as const;

/** Every rung of the spacing grid, as its step index. */
export const SPACE_STEPS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
] as const;

/** The elevation ladder, by the class the page paints them with. */
export const ELEVATIONS = [
  { name: 'elevation-1', note: 'Resting: a card, a piece on the board' },
  { name: 'elevation-2', note: 'Raised: the card on top of a stack' },
  { name: 'elevation-3', note: 'Floating: a toast' },
  { name: 'elevation-4', note: 'Modal: the only thing on screen' },
  { name: 'elevation-tuck', note: 'Cast upward, onto the card in front' },
] as const;

/** The app's stacking order, lowest first. Mirrors the $z-* tokens. */
export const LAYERS = [
  { name: 'space-detail', note: 'The title-deed sheet' },
  { name: 'spectator', note: "Somebody else's decision, veiled" },
  { name: 'drawer', note: "A drawer's scrim" },
  { name: 'modal', note: "A decision's scrim, and a trade's" },
  { name: 'notice', note: 'Toasts and the command-error banner' },
  { name: 'header', note: 'Above every scrim, so the nav is never dead' },
] as const;

export const DURATIONS = ['duration-fast', 'duration-base', 'duration-slow'] as const;
