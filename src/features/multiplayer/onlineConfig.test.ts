import { describe, expect, it } from 'vitest';
import { isOnlineEnabled, onlineConfig, parseOnlineConfig } from './onlineConfig.utils';

/**
 * The load-bearing behaviour is the negative one: with no configuration this
 * build has to be exactly the offline game, silently and without throwing.
 */

const env = (over: Partial<ImportMetaEnv> = {}): ImportMetaEnv =>
  ({ ...over }) as ImportMetaEnv;

const URL = 'https://abcdefgh.supabase.co';
const KEY = 'anon-key-value';

describe('parseOnlineConfig', () => {
  it('reads a complete configuration', () => {
    expect(
      parseOnlineConfig(env({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: KEY }))
    ).toEqual({ url: URL, anonKey: KEY });
  });

  it('reports no configuration when the environment is empty', () => {
    // This is the case every unit test and every offline build runs in.
    expect(parseOnlineConfig(env())).toBeNull();
  });

  it.each([
    ['no url', { VITE_SUPABASE_ANON_KEY: KEY }],
    ['no key', { VITE_SUPABASE_URL: URL }],
    ['a blank url', { VITE_SUPABASE_URL: '   ', VITE_SUPABASE_ANON_KEY: KEY }],
    ['a blank key', { VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: '  ' }],
  ])('refuses half a configuration: %s', (_label, values) => {
    // Half a config is worse than none - it would let the online path start
    // and fail somewhere further in, mid-game.
    expect(parseOnlineConfig(env(values))).toBeNull();
  });

  it.each([
    ['a relative path', '/supabase'],
    ['a bare host', 'abcdefgh.supabase.co'],
    ['a javascript url', 'javascript:alert(1)'],
    ['nonsense', 'not a url at all'],
  ])('refuses a url that is not a remote origin: %s', (_label, url) => {
    expect(
      parseOnlineConfig(env({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: KEY }))
    ).toBeNull();
  });

  it('trims surrounding whitespace, which .env files collect', () => {
    expect(
      parseOnlineConfig(
        env({ VITE_SUPABASE_URL: ` ${URL} `, VITE_SUPABASE_ANON_KEY: ` ${KEY} ` })
      )
    ).toEqual({ url: URL, anonKey: KEY });
  });
});

describe('this build', () => {
  it('resolves its config without throwing at module load', () => {
    // Evaluating the module is the assertion: a throw here would take every
    // other test file down with it.
    expect(onlineConfig === null || typeof onlineConfig.url === 'string').toBe(true);
  });

  it('is offline under the test environment', () => {
    // Vitest runs in mode `test`, which loads no .env file - and must not.
    // A plain `.env` in the repo would silently turn this to `true` and give
    // every unit test a network-enabled config.
    expect(isOnlineEnabled()).toBe(false);
  });
});
