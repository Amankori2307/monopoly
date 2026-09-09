/**
 * How the game looks, as distinct from which edition it is.
 *
 * An edition (`src/domain/themes/`) decides what the forty squares are called,
 * what the money is counted in and what the pieces are. An appearance decides
 * only the colours. They were the same choice until now: `data-theme` was set
 * straight from `GameState.themeId`, so the only way to recolour the board was
 * to play a different board.
 *
 * This is a **per-device preference**, not game state - the same reasoning as
 * `soundEnabled`. Two people playing online from two phones can look at the
 * same game in different palettes without anything to reconcile, which is
 * exactly why it must not go into `GameState`: a field there has to be agreed
 * by every device, and there is nothing to agree about here.
 */
export const APPEARANCES = [
  {
    id: 'edition',
    label: 'Match the edition',
    description: "The edition's own colors",
  },
  {
    id: 'aesthetic',
    label: 'Aesthetic',
    description: 'Modern, sharp and minimal',
  },
] as const;

/**
 * Derived from the list above rather than declared, so the two cannot drift.
 * Exempt from the `*.interfaces.ts` rule for that reason - see
 * docs/conventions.md section 1.
 */
export type AppearanceId = (typeof APPEARANCES)[number]['id'];

/** The default: follow whichever edition the game is being played as. */
export const EDITION_APPEARANCE: AppearanceId = 'edition';
