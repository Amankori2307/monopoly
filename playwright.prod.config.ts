import { defineConfig } from '@playwright/test';

// Its own port, and not one anything else uses. `reuseExistingServer` is on
// locally, so a server left running on a shared port got ADOPTED by this suite -
// substituting a host WITH history fallback for the static host whose lack of
// one is the entire point here. The first test caught it (it asserts the host
// really 404s), but it failed pointing at nothing.
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
    launchOptions: {
      /**
       * This suite serves the PRODUCTION build, which has always carried a real
       * Supabase config from `.env.production` - so it has always been an
       * online build. It got away with it because none of its tests visits an
       * online route, which is luck rather than a guarantee. Blackholed at the
       * resolver, like the e2e suite, so it stays luck-free.
       */
      args: [
        '--host-resolver-rules=MAP fonts.googleapis.com ~NOTFOUND,MAP fonts.gstatic.com ~NOTFOUND,MAP *.supabase.co ~NOTFOUND,MAP supabase.co ~NOTFOUND',
      ],
    },
  },
  webServer: {
    command: `node tools/serve-build.mjs ${PORT}`,
    url: `http://localhost:${PORT}/monopoly/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
