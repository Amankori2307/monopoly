import { describe, expect, it } from 'vitest';
import { SETUP_ERRORS } from './setup.constants';
import type { SetupDraft } from './setup.interfaces';
import { trimPlayerNames, validateSetupDraft } from './setupValidation.utils';

const draft = (playerNames: string[]): SetupDraft => ({ playerNames });

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

  // "rejects duplicate tokens" and "reports the empty name before the
  // duplicate token" were here. Nobody picks a colour now, so the state they
  // refused cannot be built - SETUP_ERRORS.duplicateToken is gone with them.
});

describe('trimPlayerNames', () => {
  it('trims surrounding whitespace', () => {
    expect(trimPlayerNames([' Asha ', 'Vikram '])).toEqual(['Asha', 'Vikram']);
  });
});
