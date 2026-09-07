import { defineConfig } from '@playwright/test';

const PORT = 3100;

/**
 * Two real browsers against a real backend.
 *
 * Runs against the **production build**, not the dev server, and that is
 * forced rather than chosen: the Supabase config lives in `.env.production`, so
 * `development` mode resolves no config at all - deliberately, so the ordinary
 * e2e suite can never reach the network. The only way to exercise online play
 * is to serve what a production build produced.
 *
 * Excluded from `pnpm test:e2e` for the same reason it exists: it writes real
 * rows to a real project, so it is opt-in.
 *
 * Run with: pnpm test:online
 */
export default defineConfig({
  testDir: './tests/online',
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  // Two contexts talking to one table: parallel runs would fight over it.
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: `http://localhost:${PORT}/monopoly/`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `node tools/serve-build.mjs ${PORT}`,
    url: `http://localhost:${PORT}/monopoly/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
