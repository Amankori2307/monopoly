import { defineConfig } from '@playwright/test';

const PORT = 3200;

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
