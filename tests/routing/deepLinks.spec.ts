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

  await expect(page.getByRole('button', { name: 'Create game' })).toBeVisible();
});

test('opens a deep link to the rules straight from the address bar', async ({ page }) => {
  // The bug this file exists for: with BrowserRouter this URL was a hard 404,
  // so the rules page was unreachable by link and unrecoverable by refresh.
  await page.goto('#/rules');

  await expect(page.getByRole('heading', { name: 'Rules of play' })).toBeVisible();
});

test('survives a reload deep inside the app', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();

  const gameUrl = page.url();
  await page.reload();

  // A refresh mid-game is the other half of the same bug, and the one a player
  // would actually hit.
  expect(page.url()).toBe(gameUrl);
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
});
