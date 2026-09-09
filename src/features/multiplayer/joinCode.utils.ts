import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from './joinCode.constants';

/**
 * A typed code, made comparable to a minted one.
 *
 * Upper-cased and stripped of everything outside the alphabet, so a code read
 * aloud and typed with spaces or dashes - "ABC 123", "abc-123" - is the same
 * code. The RPC upper-cases too; doing it here as well is what lets the field
 * show the player the canonical form as they type.
 */
export const normaliseJoinCode = (raw: string): string =>
  raw
    .toUpperCase()
    .split('')
    .filter((character) => JOIN_CODE_ALPHABET.includes(character))
    .join('');

/**
 * What to put in the field: normalised, and cut to a code's length.
 *
 * Split from `normaliseJoinCode` deliberately. If `createJoinCode`'s length
 * ever changes, a normaliser that sliced would silently truncate every code
 * already stored on a device and break every table it could have rejoined.
 * Only the input field wants the cut.
 */
export const takeJoinCode = (raw: string): string =>
  normaliseJoinCode(raw).slice(0, JOIN_CODE_LENGTH);

/**
 * Why this code cannot be submitted yet, or null.
 *
 * The established `*BlockedReason` shape: one pure function that both the
 * control disables from and the caller refuses with, so a live button is
 * always a request that will be attempted. See CLAUDE.md section 8.
 */
export const joinBlockedReason = (code: string): string | null => {
  const normalised = takeJoinCode(code);
  if (normalised.length === 0) {
    return 'Enter the code you were given';
  }
  if (normalised.length < JOIN_CODE_LENGTH) {
    return `A code is ${JOIN_CODE_LENGTH} characters`;
  }
  return null;
};
