/** Copy and layout values for the game screen. */

/** The stack reserves sidebar space, so keep it to a few rows. */
export const MAX_VISIBLE_TOASTS = 3;

/** How long a toast stays up before dismissing itself. */
export const TOAST_DISMISS_MS = 4200;

/**
 * How long a bot waits before it moves.
 *
 * Not a handicap and not suspense: with no pause at all a bot's whole turn -
 * roll, buy, build, end - lands inside one frame, and the only evidence any of
 * it happened is the history. The board's own token walk takes up to a couple
 * of seconds and this sits on top of it, so what a person actually sees is
 * "something is about to happen", then the move.
 */
export const BOT_MOVE_DELAY_MS = 900;
