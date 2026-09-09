import { expect, test, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { VIEWPORTS } from './helpers';

/**
 * Typing in a code somebody read out.
 *
 * The dev server resolves a real config, and the browser cannot resolve the
 * backend's host - playwright.config.ts blackholes it, so the offline promise
 * is enforced rather than assumed. That leaves the typing behaviour fully
 * testable and the network genuinely unreachable.
 */

test.use({ viewport: VIEWPORTS.desktop });

const field = (page: Page) => page.getByTestId(TEST_IDS.joinCodeInput);

test('uppercases a code typed in lower case', async ({ page }) => {
  await page.goto('/#/join');

  await field(page).fill('abc234');

  await expect(field(page)).toHaveValue('ABC234');
});

// The alphabet has no O, 0, I or 1 precisely because they are misread, so
// there is nothing to fold them to.
test('never accepts the characters a code cannot contain', async ({ page }) => {
  await page.goto('/#/join');

  await field(page).fill('AOB0C1');

  await expect(field(page)).toHaveValue('ABC');
});

test('absorbs the spaces people add when reading a code out', async ({ page }) => {
  await page.goto('/#/join');

  await field(page).fill('abc 234');

  await expect(field(page)).toHaveValue('ABC234');
});

test('stops at the length of a code', async ({ page }) => {
  await page.goto('/#/join');

  await field(page).fill('ABC234XYZ');

  await expect(field(page)).toHaveValue('ABC234');
});

/**
 * A half-typed code is refused with a reason on screen. The exact wording -
 * that a code is six characters - is `joinBlockedReason`'s, and is covered in
 * joinCode.utils.test.ts: it cannot be asserted here, because a build with no
 * server refuses for the more fundamental reason first, which is right.
 */
test('refuses a half-typed code, with a reason on screen', async ({ page }) => {
  await page.goto('/#/join');

  await field(page).fill('ABC');

  await expect(page.getByTestId(TEST_IDS.joinSubmitButton)).toBeDisabled();
  await expect(page.getByTestId(TEST_IDS.joinBlockedReason)).toBeVisible();
});

test('asks for a code when the field is empty', async ({ page }) => {
  await page.goto('/#/join');

  await expect(page.getByTestId(TEST_IDS.joinSubmitButton)).toBeDisabled();
  await expect(page.getByTestId(TEST_IDS.joinBlockedReason)).toBeVisible();
});

/**
 * A build with no server says so on the screen, not in a console - the same
 * contract lobby.spec.ts asserts for the chooser's missing tiles.
 */
test('lets a full code be sent, and says when the table cannot be reached', async ({
  page,
}) => {
  await page.goto('/#/join');
  await field(page).fill('ABC234');

  // The build resolves a config now, so a valid code is sendable - what it
  // cannot do in this suite is resolve the backend's host, which
  // playwright.config.ts blackholes on purpose.
  await expect(page.getByTestId(TEST_IDS.joinSubmitButton)).toBeEnabled();
  await page.getByTestId(TEST_IDS.joinSubmitButton).click();

  await expect(page.locator('.error-text')).toBeVisible();
});
