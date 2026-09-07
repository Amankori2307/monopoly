import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';

/**
 * The lobby, in a build with no server configured.
 *
 * The dev server runs in `development` mode, which resolves no Supabase config
 * on purpose - the ordinary e2e suite must never reach the network. So what is
 * asserted here is the other half of the contract: an offline build offers no
 * control that cannot work, and a lobby link that leads nowhere says so instead
 * of showing an empty table.
 */

test('offers no online control when the build has no server', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Create game' })).toBeVisible();
  // Never render a control that cannot work - see onlineConfig.
  await expect(page.getByTestId(TEST_IDS.playOnlineButton)).toHaveCount(0);
});

test('says a table is not there rather than showing an empty one', async ({ page }) => {
  await page.goto('/#/lobby/no-such-game?code=NOPE12');

  await expect(page.getByText(/not there/i)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.lobbySeats)).toHaveCount(0);
  // And there is a way back, rather than a dead end.
  await expect(page.getByRole('link', { name: /back to games/i })).toBeVisible();
});

test('a lobby link with no code is not a lobby', async ({ page }) => {
  await page.goto('/#/lobby/some-game');

  // No code means no capability, so there is nothing to show.
  await expect(page.getByTestId(TEST_IDS.lobbyStartButton)).toBeDisabled();
});
