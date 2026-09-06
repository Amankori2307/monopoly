/**
 * The build-time environment, typed.
 *
 * Written out rather than pulled in with `/// <reference types="vite/client" />`:
 * that reference also declares `*.svg`, `*.png`, `*.wav` and `*.json`, which
 * src/types/assets.d.ts already declares, and two ambient `export default`s for
 * the same module pattern collide.
 *
 * Both values are optional on purpose. They are absent in every unit test and
 * in any build made without them, and onlineConfig treats that as "offline" -
 * so nothing here may be typed as always present.
 */
interface ImportMetaEnv {
  /** The Supabase project URL, e.g. https://<ref>.supabase.co */
  readonly VITE_SUPABASE_URL?: string;
  /**
   * The Supabase anon key.
   *
   * Public by design: it is compiled into the JS bundle every visitor
   * downloads, so it is an identifier, not a secret. Row Level Security is the
   * actual access control. A `service_role` key must never appear here, in a
   * .env file, or in CI - it bypasses RLS entirely.
   */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
