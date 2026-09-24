import { describe, expect, it } from 'vitest';
import { SETUP_ERRORS } from './setup.constants';
import type { SetupDraft } from './setup.interfaces';
import { trimPlayerNames, validateSetupDraft } from './setupValidation.utils';

const draft = (playerNames: string[], playerIsBot?: boolean[]): SetupDraft => ({
  playerNames,
  playerIsBot: playerIsBot ?? playerNames.map(() => false),
});

describe('validateSetupDraft', () => {
  it('accepts distinct names', () => {
    expect(validateSetupDraft(draft(['Asha', 'Vikram']))).toBeNull();
  });

  it('rejects an empty name', () => {
    expect(validateSetupDraft(draft(['Asha', '']))).toBe(SETUP_ERRORS.emptyName);
  });

  it('rejects a whitespace-only name', () => {
    expect(validateSetupDraft(draft(['Asha', '   ']))).toBe(SETUP_ERRORS.emptyName);
  });

  it('rejects duplicate names regardless of case or padding', () => {
    expect(validateSetupDraft(draft(['Asha', ' asha ']))).toBe(
      SETUP_ERRORS.duplicateName
    );
  });

  it('accepts a table with one person and the rest bots', () => {
    expect(validateSetupDraft(draft(['Asha', 'Bot 2'], [false, true]))).toBeNull();
  });

  /**
   * A table of nothing but bots plays itself to a winner with nobody watching a
   * decision. Not harmful, and not a game.
   */
  it('rejects a table with nobody at it', () => {
    expect(validateSetupDraft(draft(['Bot 1', 'Bot 2'], [true, true]))).toBe(
      SETUP_ERRORS.noHumans
    );
  });

  it('reports a blank name before it reports a table of bots', () => {
    // The first thing wrong with the form should be the first thing said about
    // it, and a blank field is the more ordinary mistake.
    expect(validateSetupDraft(draft(['', 'Bot 2'], [true, true]))).toBe(
      SETUP_ERRORS.emptyName
    );
  });

  // "rejects duplicate tokens" and "reports the empty name before the
  // duplicate token" were here. Nobody picks a colour now, so the state they
  // refused cannot be built - SETUP_ERRORS.duplicateToken is gone with them.
});

describe('trimPlayerNames', () => {
  it('trims surrounding whitespace', () => {
    expect(trimPlayerNames([' Asha ', 'Vikram '])).toEqual(['Asha', 'Vikram']);
  });
});
