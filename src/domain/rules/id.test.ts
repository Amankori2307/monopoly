import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from './id.utils';

/**
 * `crypto.randomUUID` is restricted to secure contexts - it is there on
 * localhost and https, and undefined on a plain-http address like
 * http://192.168.1.5:3200, which is exactly how you reach a dev server from
 * another computer. Without a fallback the engine threw on the very first event
 * id and the whole game broke, online or not.
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Hides randomUUID the way a non-secure origin does. */
const withoutRandomUUID = () => {
  const original = crypto.randomUUID;
  // @ts-expect-error - deleting it is exactly what the browser does.
  delete crypto.randomUUID;
  return () => {
    crypto.randomUUID = original;
  };
};

afterEach(() => vi.restoreAllMocks());

describe('randomUUID', () => {
  it('uses the platform when it is there', () => {
    const spy = vi.spyOn(crypto, 'randomUUID');

    randomUUID();

    expect(spy).toHaveBeenCalled();
  });

  it('still returns a UUID when the platform does not offer one', () => {
    const restore = withoutRandomUUID();
    try {
      expect(randomUUID()).toMatch(UUID_V4);
    } finally {
      restore();
    }
  });

  it('sets the version and variant bits, because Postgres checks them', () => {
    // A game id goes into a `uuid` column, which rejects anything that is not
    // one - so the shape matters as much as the entropy.
    const restore = withoutRandomUUID();
    try {
      for (let i = 0; i < 50; i += 1) {
        expect(randomUUID()).toMatch(UUID_V4);
      }
    } finally {
      restore();
    }
  });

  it('does not repeat itself', () => {
    const restore = withoutRandomUUID();
    try {
      const ids = new Set(Array.from({ length: 500 }, () => randomUUID()));
      expect(ids.size).toBe(500);
    } finally {
      restore();
    }
  });
});
