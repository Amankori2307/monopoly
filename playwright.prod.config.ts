import { defineConfig } from '@playwright/test';

// Its own port, not 3200. `pnpm dev:online` and `pnpm tunnel` both use 3200,
// and `reuseExistingServer` below is on locally - so a dev server left running
// got ADOPTED by this suite, substituting a host WITH history fallback for the
// static host whose lack of one is the entire point here. The first test caught
// it (it asserts the host really 404s), but it failed pointing at nothing.
const PORT = 3300;

/**
 * Routing tests against the real production build on a real static host.
 *
 * Separate from `playwright.config.ts` because the two cannot share a server:
 * the dev server rewrites unknown paths to index.html, which is the exact
 * behaviour that hid the deep-link 404 in the first place. `tools/serve-build.mjs`
 * has no such fallback, so a broken route fails here the way it fails on
 * GitHub Pages.
 *
 * Run with: pnpm test:routing
 */
export default defineConfig({
  testDir: './tests/routing',
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
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
