import type { SetupDraft } from './setup.interfaces';

export type { SetupDraft } from './setup.interfaces';

import { SETUP_ERRORS, type SetupErrorMessage } from './setup.constants';

/**
 * Pure validation for the setup form. Returns the first problem, or null.
 * Kept out of the component so every rule is unit-testable on its own.
 */
export const validateSetupDraft = ({
  playerNames,
}: SetupDraft): SetupErrorMessage | null => {
  const trimmedNames = playerNames.map((name) => name.trim());

  if (trimmedNames.some((name) => name.length === 0)) {
    return SETUP_ERRORS.emptyName;
  }

  const uniqueNames = new Set(trimmedNames.map((name) => name.toLowerCase()));
  if (uniqueNames.size !== trimmedNames.length) {
    return SETUP_ERRORS.duplicateName;
  }

  // There was a duplicate-TOKEN rule here too. Two players can no longer share
  // a colour, because nobody picks one: the engine assigns it by creation
  // order from one palette, so the state this rule refused is unrepresentable.

  return null;
};

export const trimPlayerNames = (playerNames: string[]) =>
  playerNames.map((name) => name.trim());
