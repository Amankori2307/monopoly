import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';

/**
 * These run against `build/` on a static server with no history fallback -
 * GitHub Pages' actual behaviour. See tools/serve-build.mjs.
 */

test('the host really does 404 on an unknown path', async ({ request }) => {
  // The control case, and it is not optional: every other test here passes
  // trivially against a server that rewrites unknown paths to index.html.
  // If this ever returns 200, the simulation has stopped simulating anything
  // and the rest of this file proves nothing.
  const response = await request.get('/rules', { maxRedirects: 0 });

  expect(response.status()).toBe(404);
});

test('serves the app at the base path', async ({ page }) => {
  await page.goto('./');

  // The front door is a chooser now, so its own control is the assertion.
  await expect(page.getByTestId(TEST_IDS.chooserPlayLocal)).toBeVisible();
});

/**
 * An unmatched hash used to render a blank page - and under HashRouter that is
 * easy to hit by accident, because a bare `<a href="#faq">` is a route rather
 * than an anchor. This is the only suite that runs against the real static
 * host, so it is where the claim belongs.
 */
test('says so on a route that does not exist, rather than going blank', async ({
  page,
}) => {
  await page.goto('./#/no-such-screen');

  await expect(page.getByTestId(TEST_IDS.notFoundPanel)).toBeVisible();
  await expect(page.getByRole('link', { name: /Back to the start/i })).toBeVisible();
});

test('opens a deep link to the rules straight from the address bar', async ({ page }) => {
  // The bug this file exists for: with BrowserRouter this URL was a hard 404,
  // so the rules page was unreachable by link and unrecoverable by refresh.
  await page.goto('#/rules');

  await expect(page.getByRole('heading', { name: 'Rules of play' })).toBeVisible();
});

test('survives a reload deep inside the app', async ({ page }) => {
  await page.goto('./#/new');
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();

  const gameUrl = page.url();
  await page.reload();

  // A refresh mid-game is the other half of the same bug, and the one a player
  // would actually hit.
  expect(page.url()).toBe(gameUrl);
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
});
