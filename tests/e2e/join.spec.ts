import { expect, test, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { VIEWPORTS } from './helpers';

/**
 * Typing in a code somebody read out.
 *
 * The dev server resolves no Supabase config on purpose, so nothing here
 * reaches the network - which is exactly why the field renders and disables
 * rather than disappearing. The entry point obeys "never render a control that
 * cannot work" (the chooser omits the Join tile entirely in an offline build,
 * asserted in lobby.spec.ts); this screen is only reachable by URL, and on it
 * a labelled field whose button says why is better than a bare sentence.
 *
 * It also gives the whole typing journey a home in the offline build, which is
 * the only build the ordinary suite has.
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
test('says a build with no server cannot join, on the control itself', async ({
  page,
}) => {
  await page.goto('/#/join');
  await field(page).fill('ABC234');

  // A full, valid code and still refused - so the reason has to be the
  // build's, not the code's.
  await expect(page.getByTestId(TEST_IDS.joinSubmitButton)).toBeDisabled();
  await expect(page.getByTestId(TEST_IDS.joinBlockedReason)).toContainText(
    /cannot play online/i
  );
});
