/** Timing and audio for the dice roll animation. */

/** How long the tumble runs before the roll is committed to the engine. */
export const DICE_ROLL_DURATION_MS = 520;
/** How often the shown faces change while tumbling. */
export const DICE_SHUFFLE_INTERVAL_MS = 80;
export const DICE_VOLUME = 0.42;

/** Delay between a token's steps while it walks around the board. */
/** The pace of a short hop, and the slowest a step is ever taken. */
export const TOKEN_STEP_INTERVAL_MS = 180;

/**
 * Roughly how long a walk should take, however far it goes.
 *
 * A dice hop of six is well inside this and keeps the full 180ms per step; a
 * card that sends a player the whole way round is thirty-nine steps, which at
 * that pace would be a seven-second wait on every Advance card. The interval
 * shrinks to fit instead, and every step still ticks.
 */
export const TOKEN_WALK_BUDGET_MS = 2200;

/** However long the walk, a step is never quicker than this to follow. */
export const TOKEN_MIN_STEP_INTERVAL_MS = 70;
export const TOKEN_STEP_VOLUME = 0.35;

/**
 * How many copies of the step clip to keep.
 *
 * One element cannot overlap itself, so at the shortest interval a single clip
 * cut off the tak still sounding and a long walk lost most of its steps. Four is
 * enough for the floor interval without loading the clip needlessly often.
 */
export const TOKEN_STEP_POOL_SIZE = 4;
