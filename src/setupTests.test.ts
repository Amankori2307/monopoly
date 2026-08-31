import { describe, expect, it } from 'vitest';

/**
 * Proves the global storage reset in setupTests.ts actually runs.
 *
 * These two tests would pass in either order if the reset were missing from the
 * first one's perspective - the point is that the second sees a clean store
 * despite the first having written to it.
 */
describe('localStorage is reset between tests', () => {
  it('writes a key', () => {
    localStorage.setItem('monopoly.probe', 'left behind');

    expect(localStorage.getItem('monopoly.probe')).toBe('left behind');
  });

  it('does not see the previous test’s key', () => {
    expect(localStorage.getItem('monopoly.probe')).toBeNull();
  });
});
