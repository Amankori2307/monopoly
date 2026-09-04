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
