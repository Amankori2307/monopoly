/** Copy and defaults for the new-game setup form. */

export const DEFAULT_GAME_NAME = '';

/**
 * One pattern for three sibling errors.
 *
 * They used to be "Every player needs a name." / "Player names must be
 * unique." / "Each player must use a different token." - three subjects and
 * three constructions for the same kind of problem, in the app's most-seen
 * form.
 */
export const SETUP_ERRORS = {
  emptyName: 'Every player needs a name.',
  duplicateName: 'Two players cannot share a name.',
  duplicateToken: 'Two players cannot share a token.',
} as const;

export type SetupErrorMessage = (typeof SETUP_ERRORS)[keyof typeof SETUP_ERRORS];
