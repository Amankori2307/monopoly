/** Copy and defaults for the new-game setup form. */

export const DEFAULT_GAME_NAME = '';

export const SETUP_ERRORS = {
  emptyName: 'Every player needs a name.',
  duplicateName: 'Player names must be unique.',
  duplicateToken: 'Each player must use a different token.',
} as const;

export type SetupErrorMessage = (typeof SETUP_ERRORS)[keyof typeof SETUP_ERRORS];
