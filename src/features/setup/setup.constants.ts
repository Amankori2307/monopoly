/** Copy and defaults for the new-game setup form. */

export const DEFAULT_GAME_NAME = '';

/**
 * One pattern for two sibling errors.
 *
 * They used to be "Every player needs a name." / "Player names must be
 * unique." / "Each player must use a different token." - three subjects and
 * three constructions for the same kind of problem, in the app's most-seen
 * form. The third is gone outright: nobody picks a colour, so two players
 * sharing one is unrepresentable rather than refused.
 */
export const SETUP_ERRORS = {
  emptyName: 'Every player needs a name.',
  duplicateName: 'Two players cannot share a name.',
  /**
   * A table of nothing but bots plays itself to a winner with nobody watching
   * a decision. It is not harmful and it is not a game, and refusing it here
   * costs one line where explaining it afterwards costs a support question.
   */
  noHumans: 'Someone has to play, so one seat cannot be a bot.',
} as const;

export type SetupErrorMessage = (typeof SETUP_ERRORS)[keyof typeof SETUP_ERRORS];
