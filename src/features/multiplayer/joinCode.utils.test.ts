import { describe, expect, it } from 'vitest';
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from './joinCode.constants';
import { joinBlockedReason, normaliseJoinCode, takeJoinCode } from './joinCode.utils';
import { createJoinCode } from './onlineSession';

describe('takeJoinCode', () => {
  it('uppercases a code typed in lower case', () => {
    expect(takeJoinCode('abc234')).toBe('ABC234');
  });

  // The alphabet excludes O, 0, I and 1 because they are misread. There is
  // nothing to fold them to, so they are dropped.
  it('drops the characters no code can contain', () => {
    expect(takeJoinCode('AOB0C1I2')).toBe('ABC2');
  });

  it('absorbs the spaces and dashes people add for readability', () => {
    expect(takeJoinCode('abc-234')).toBe('ABC234');
  });

  it('stops at the length of a code', () => {
    expect(takeJoinCode('ABC234XYZ')).toBe('ABC234');
  });
});

/**
 * The split from `takeJoinCode` is the point: a normaliser that sliced would
 * silently truncate every code already stored on a device the day
 * `createJoinCode`'s length changed, breaking every table it could rejoin.
 */
describe('normaliseJoinCode', () => {
  it('does not truncate a code it is only cleaning', () => {
    expect(normaliseJoinCode('ABC234XYZ')).toBe('ABC234XYZ');
  });
});

describe('joinBlockedReason', () => {
  it('asks for a code when the field is empty', () => {
    expect(joinBlockedReason('', 'Asha')).toMatch(/code/i);
  });

  it('says how long a code is when it is too short', () => {
    expect(joinBlockedReason('ABC', 'Asha')).toContain(String(JOIN_CODE_LENGTH));
  });

  it('lets a full code through', () => {
    expect(joinBlockedReason('ABC234', 'Asha')).toBeNull();
  });

  it('lets a code through however it was typed', () => {
    expect(joinBlockedReason('abc 234', 'Asha')).toBeNull();
  });

  /**
   * The name is asked HERE now, not in the lobby.
   *
   * Joining a table is taking a seat at it, so this screen claims one - and a
   * seat with no name on it is what the lobby's own claim rule always refused.
   */
  it('asks for a name once the code is good', () => {
    expect(joinBlockedReason('ABC234', '')).toMatch(/name/i);
    expect(joinBlockedReason('ABC234', '   ')).toMatch(/name/i);
  });

  it('reports the code before the name', () => {
    // First error wins, and the code is the field they are looking at.
    expect(joinBlockedReason('', '')).toMatch(/code/i);
  });
});

/**
 * The generator and the parser tied together. Without this they can drift -
 * a code the field refuses and the server mints, or the other way round.
 */
describe('every code this build mints', () => {
  it('is one a person can type back in', () => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const code = createJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      expect([...code].every((character) => JOIN_CODE_ALPHABET.includes(character))).toBe(
        true
      );
      expect(normaliseJoinCode(code)).toBe(code);
      expect(joinBlockedReason(code, 'Asha')).toBeNull();
    }
  });
});
