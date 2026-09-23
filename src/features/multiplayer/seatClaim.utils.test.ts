import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearHostSecret,
  clearJoinCode,
  getHostSecretKey,
  getJoinCodeKey,
  readDeviceId,
  readHostSecret,
  readJoinCode,
  writeHostSecret,
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

/**
 * The host secret is a capability, not state.
 *
 * It proves this device opened the table, and it exists because `deviceId`
 * cannot: `fetch_game` hands the whole seats array to every code-holder, so the
 * server publishes each device's id to everybody who could be asked to match
 * it. Per game and per device for the same reason the join code is - a device
 * that was never given one must not read it out of somebody else's save.
 */
describe('the stored host secret', () => {
  const SECRET = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

  it('is remembered per game', () => {
    writeHostSecret('game-1', SECRET);

    expect(readHostSecret('game-1')).toBe(SECRET);
    expect(readHostSecret('game-2')).toBeNull();
  });

  it('refuses a stored value that is not a uuid', () => {
    // Validated rather than trusted: this is whatever is on the disk of a
    // browser that may have run an older build or been hand-edited, and it goes
    // to a uuid column - a malformed value is a 400, not a refusal.
    window.localStorage.setItem(getHostSecretKey('game-1'), 'not-a-uuid');

    expect(readHostSecret('game-1')).toBeNull();
  });

  it('writes nothing when there is no secret to write', () => {
    // A protocol-1 row mints none, and storing "null" would then read back as a
    // secret this device does not have.
    writeHostSecret('game-1', null);

    expect(window.localStorage.getItem(getHostSecretKey('game-1'))).toBeNull();
  });

  it('is cleared with the game it belongs to', () => {
    writeHostSecret('game-1', SECRET);
    clearHostSecret('game-1');

    expect(readHostSecret('game-1')).toBeNull();
  });

  it('survives storage being blocked', () => {
    // A private window throws on both the read and the write. Losing the secret
    // loses the ability to start that lobby, which is the right failure - the
    // same is already true of the join code.
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readHostSecret('game-1')).toBeNull();
    getItem.mockRestore();
  });
});
