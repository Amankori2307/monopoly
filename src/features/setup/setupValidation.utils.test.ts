import { describe, expect, it } from 'vitest';
import { SETUP_ERRORS } from './setup.constants';
import { trimPlayerNames, validateSetupDraft } from './setupValidation.utils';

const draft = (playerNames: string[], playerTokens: string[]) => ({
  playerNames,
  playerTokens,
});

describe('validateSetupDraft', () => {
  it('accepts distinct names and tokens', () => {
    expect(validateSetupDraft(draft(['Asha', 'Vikram'], ['elephant', 'train']))).toBeNull();
  });

  it('rejects an empty name', () => {
    expect(validateSetupDraft(draft(['Asha', ''], ['elephant', 'train']))).toBe(
      SETUP_ERRORS.emptyName
    );
  });

  it('rejects a whitespace-only name', () => {
    expect(validateSetupDraft(draft(['Asha', '   '], ['elephant', 'train']))).toBe(
      SETUP_ERRORS.emptyName
    );
  });

  it('rejects duplicate names regardless of case or padding', () => {
    expect(validateSetupDraft(draft(['Asha', ' asha '], ['elephant', 'train']))).toBe(
      SETUP_ERRORS.duplicateName
    );
  });

  it('rejects duplicate tokens', () => {
    expect(validateSetupDraft(draft(['Asha', 'Vikram'], ['train', 'train']))).toBe(
      SETUP_ERRORS.duplicateToken
    );
  });

  it('reports the empty name before the duplicate token', () => {
    expect(validateSetupDraft(draft(['', ''], ['train', 'train']))).toBe(
      SETUP_ERRORS.emptyName
    );
  });
});

describe('trimPlayerNames', () => {
  it('trims surrounding whitespace', () => {
    expect(trimPlayerNames([' Asha ', 'Vikram '])).toEqual(['Asha', 'Vikram']);
  });
});
