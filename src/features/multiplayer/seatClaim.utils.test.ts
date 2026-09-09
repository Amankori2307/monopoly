import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearJoinCode,
  getJoinCodeKey,
  readDeviceId,
  readJoinCode,
  writeJoinCode,
} from './seatClaim.utils';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('the stored join code', () => {
  it('remembers a code for one game and not for another', () => {
    writeJoinCode('game-a', 'ABC234');

    expect(readJoinCode('game-a')).toBe('ABC234');
    expect(readJoinCode('game-b')).toBeNull();
  });

  /**
   * Validated rather than trusted: this is whatever is on the disk of a
   * browser that may have run an older build or been hand-edited, and an
   * invalid code would be sent to the network.
   */
  it('refuses a stored code containing a character no code can contain', () => {
    localStorage.setItem(getJoinCodeKey('game-a'), 'ABC0O1');

    expect(readJoinCode('game-a')).toBeNull();
  });

  it('refuses an empty stored code', () => {
    localStorage.setItem(getJoinCodeKey('game-a'), '');

    expect(readJoinCode('game-a')).toBeNull();
  });

  it('forgets the code when a game is deleted', () => {
    writeJoinCode('game-a', 'ABC234');
    clearJoinCode('game-a');

    expect(readJoinCode('game-a')).toBeNull();
  });

  // A browser with storage blocked throws on the read too.
  it('returns null rather than throwing when storage is blocked', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readJoinCode('game-a')).toBeNull();
  });

  it('does not throw when a private mode refuses the write', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => writeJoinCode('game-a', 'ABC234')).not.toThrow();
  });
});

describe('the device id', () => {
  it('is invented once and reused', () => {
    expect(readDeviceId()).toBe(readDeviceId());
  });
});
