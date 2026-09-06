import type { OnlineConfig } from './onlineConfig.interfaces';

/**
 * Whether this build can talk to a realtime backend, and how.
 *
 * The whole module is built around one rule: **absent configuration is not an
 * error.** A build with no Supabase variables is exactly today's offline game,
 * and every code path that would reach the network has to be unreachable
 * rather than failing at it. So this returns `null` instead of throwing, and
 * it is read once at module load rather than lazily - a config that appears
 * halfway through a session would mean two halves of the app disagreeing about
 * which game they are playing.
 *
 * It also has to be safe to evaluate under Vitest, where `import.meta.env`
 * carries none of these. Throwing here would take every unit test with it.
 *
 * The values live in `.env.production`, so `test` and `development` resolve to
 * null and only a production build is online. That is deliberate: the unit
 * suite and the ordinary e2e run must never reach the network.
 */

/** An origin we are willing to send a game to. */
const isUsableUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    // A relative path or a `javascript:` string parses far enough to be
    // dangerous; only real remote origins qualify.
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Reads a config out of an environment, or reports that there is not one.
 *
 * Takes the environment as an argument so it can be tested without stubbing
 * `import.meta`, which Vitest cannot do per-test.
 */
export const parseOnlineConfig = (env: ImportMetaEnv): OnlineConfig | null => {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  // Half a config is more dangerous than none: it would let the online path
  // start and then fail somewhere further in, mid-game.
  if (!url || !anonKey || !isUsableUrl(url)) {
    return null;
  }

  return { url, anonKey };
};

/** This build's config, resolved once. `null` means offline-only. */
export const onlineConfig: OnlineConfig | null = parseOnlineConfig(import.meta.env);

/**
 * Whether online play can be offered at all.
 *
 * Every entry point to multiplayer is gated on this, so an offline build never
 * renders a control that cannot work.
 */
export const isOnlineEnabled = (): boolean => onlineConfig !== null;
