import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

/**
 * The suite does not reach the internet, and this is what makes that true
 * rather than merely intended.
 *
 * `fonts.googleapis.com` is blackholed because index.html pulls fonts from it:
 * fine for a reader, fatal for a test run - when it was slow to answer, a
 * two-minute suite became twenty with tests failing that had nothing wrong with
 * them. Diagnosed by the process sitting at 2% CPU for eighteen minutes; it was
 * not computing, it was waiting.
 *
 * `supabase.co` is blackholed because the dev server now RESOLVES a real
 * backend config - there is one dev script, and the player picks local or
 * online inside the game. Before this, the offline guarantee was "the config is
 * absent", which is a circumstance rather than a guarantee: one test
 * (`lobby.spec.ts`'s "says a table is not there") reached `fetch_game` and
 * still went green, so CI would have POSTed to a live project on every push
 * while proving nothing. At the resolver, a test cannot reach the backend
 * whatever the config says.
 */
const OFFLINE_RESOLVER_RULES = [
  'MAP fonts.googleapis.com ~NOTFOUND',
  'MAP fonts.gstatic.com ~NOTFOUND',
  'MAP *.supabase.co ~NOTFOUND',
  'MAP supabase.co ~NOTFOUND',
].join(',');

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
      args: [`--host-resolver-rules=${OFFLINE_RESOLVER_RULES}`],
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
