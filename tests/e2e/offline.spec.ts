import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * The suite cannot reach the internet, proved rather than promised.
 *
 * The offline guarantee used to be "the config is absent": `pnpm dev` ran in a
 * mode that resolved no backend, so nothing could be called. That is a
 * circumstance, not a guarantee, and it hid a real hole - `lobby.spec.ts`'s
 * "says a table is not there" reached `fetch_game` and still went green, so a
 * config appearing would have had CI POSTing to a live project on every push
 * while proving nothing. `pnpm test:routing` has always served a production
 * build with a real config and escaped only because no test there visits an
 * online route.
 *
 * There is one dev server now and it does resolve a config, so the guarantee
 * moved to the browser's resolver. This test is what keeps it honest: if
 * somebody widens the config or drops a resolver rule, this fails rather than
 * the suite quietly going online.
 */

/**
 * The host the app would actually call, read from the env file the dev server
 * loads. Not imported from `onlineConfig.utils`: that resolves
 * `import.meta.env`, which only Vite supplies.
 */
const backendHost = (): string => {
  const env = readFileSync(join(__dirname, '../../.env.development'), 'utf8');
  const match = /^VITE_SUPABASE_URL\s*=\s*(.+)$/m.exec(env);
  if (!match) {
    throw new Error('.env.development carries no VITE_SUPABASE_URL');
  }
  return new URL(match[1].trim()).host;
};

test('cannot resolve the backend host, whatever the config says', async ({ page }) => {
  await page.goto('/');

  // The build under test genuinely has a config - that is the point.
  const host = backendHost();
  expect(host).not.toBe('');

  const reached = await page.evaluate(async (target) => {
    try {
      await fetch(`https://${target}/rest/v1/`, { method: 'HEAD' });
      return true;
    } catch {
      return false;
    }
  }, host);

  expect(reached, `the suite reached ${host} - the resolver rules have a hole`).toBe(
    false
  );
});

// A second host, so a rule that covers the project's subdomain but not the
// apex (or the other way round) is caught.
test('cannot resolve the backend apex either', async ({ page }) => {
  await page.goto('/');

  const reached = await page.evaluate(async () => {
    try {
      await fetch('https://supabase.co/', { method: 'HEAD' });
      return true;
    } catch {
      return false;
    }
  });

  expect(reached).toBe(false);
});
