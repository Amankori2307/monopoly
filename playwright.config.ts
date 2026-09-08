import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  // A `.only` left in a spec silently shrinks the suite to one test, and the
  // run still goes green. On CI that is a failure, not a convenience.
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // Locally the list reporter is what you want to watch; on CI the HTML report
  // is uploaded as an artifact, so a failure is diagnosable without a re-run.
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    launchOptions: {
      /**
       * The suite does not reach the internet.
       *
       * index.html pulls its fonts from Google. That is fine for a reader and
       * fatal for a test run: when fonts.googleapis.com is slow to answer, every
       * page load waits on it, and a two-minute suite became twenty minutes with
       * tests failing that had nothing wrong with them. Diagnosed by the process
       * sitting at 2% CPU for eighteen minutes - it was not computing, it was
       * waiting.
       *
       * Resolving those hosts to nothing makes the browser fail instantly
       * instead, which is both faster and honest: a test should not be able to
       * pass or fail on somebody else's CDN.
       */
      args: [
        '--host-resolver-rules=MAP fonts.googleapis.com ~NOTFOUND,MAP fonts.gstatic.com ~NOTFOUND',
      ],
    },
  },
  webServer: {
    command: 'pnpm dev -- --host localhost',
    url: 'http://localhost:3000',
    // Reusing a server is what lets a local run attach to the one already
    // open in a terminal. On CI there is nothing to attach to, and adopting a
    // stray process would mean testing code this job never built.
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
