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

test('offers every way to play, whatever the build can reach', async ({ page }) => {
  await openChooser(page);

  // All three, always. Where you play is the player's choice, not a property
  // of the build - hiding the online doors made the ordinary dev server look
  // like it was missing a feature rather than following a policy.
  await expect(page.getByTestId(TEST_IDS.chooserPlayLocal)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.chooserHostOnline)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.chooserJoinOnline)).toBeVisible();
});

/**
 * The e2e build resolves a real config but cannot resolve the backend's HOST -
 * playwright.config.ts blackholes it. So these assert what a player sees when
 * the table cannot be reached, which is the failure that actually happens.
 */
test('says hosting cannot reach a server rather than failing silently', async ({
  page,
}) => {
  await page.goto('/#/host');

  await expect(page.getByTestId(TEST_IDS.openTableButton)).toBeEnabled();
  await page.getByTestId(TEST_IDS.openTableButton).click();

  await expect(page.locator('.error-text')).toBeVisible();
});

test('says joining cannot reach a server rather than blaming the code', async ({
  page,
}) => {
  await page.goto('/#/join');
  await page.getByTestId(TEST_IDS.joinCodeInput).fill('ABC234');

  // A full, valid code, so the reason cannot be the code's.
  await expect(page.getByTestId(TEST_IDS.joinSubmitButton)).toBeEnabled();
  await page.getByTestId(TEST_IDS.joinSubmitButton).click();

  await expect(page.locator('.error-text')).toContainText(/could not reach|cannot play/i);
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
