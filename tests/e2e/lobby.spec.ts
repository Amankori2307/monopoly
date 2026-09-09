import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { openChooser } from './helpers';

/**
 * The lobby, in a build with no server configured.
 *
 * The dev server runs in `development` mode, which resolves no Supabase config
 * on purpose - the ordinary e2e suite must never reach the network. So what is
 * asserted here is the other half of the contract: an offline build offers no
 * control that cannot work, and a lobby link that leads nowhere says so instead
 * of showing an empty table.
 */

test('offers no online choice when the build has no server', async ({ page }) => {
  await openChooser(page);

  // Playing on this device always works, so it is always offered.
  await expect(page.getByTestId(TEST_IDS.chooserPlayLocal)).toBeVisible();
  // Never render a control that cannot work - see onlineConfig.
  await expect(page.getByTestId(TEST_IDS.chooserHostOnline)).toHaveCount(0);
  await expect(page.getByTestId(TEST_IDS.chooserJoinOnline)).toHaveCount(0);
});

/**
 * The choices are hidden, but a URL can still be typed or bookmarked. An
 * offline build has to say what is wrong rather than render a form that cannot
 * submit - or, worse, blank.
 */
test('says hosting cannot work in a build with no server', async ({ page }) => {
  await page.goto('/#/host');

  await expect(page.getByTestId(TEST_IDS.noServerPanel)).toBeVisible();
  await expect(page.getByRole('link', { name: /Play on this device/i })).toBeVisible();
});

/**
 * The join screen keeps its field and disables it with the reason on screen,
 * rather than swapping in a panel - see JoinPage. Hosting swaps, because a
 * whole form that cannot submit is a different thing from one field.
 */
test('says joining cannot work in a build with no server', async ({ page }) => {
  await page.goto('/#/join');

  await expect(page.getByTestId(TEST_IDS.joinSubmitButton)).toBeDisabled();
  await expect(page.getByTestId(TEST_IDS.joinBlockedReason)).toContainText(
    /cannot play online/i
  );
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
