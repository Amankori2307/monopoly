import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';

/**
 * Two real browsers, one real table.
 *
 * Two **contexts**, never two pages in one: pages in a context share
 * localStorage, so they would share the seat claim and this whole file would
 * pass against an implementation that has no seats at all.
 */

/** Opens a table and returns the invite link the host would send. */
const hostATable = async (page: Page): Promise<string> => {
  // Hosting is its own screen, and its form is valid on first render - name,
  // edition and Speed Die are all prefilled - so this is one click. That is
  // deliberate: a required empty field here would turn this into a fill step in
  // the one suite that cannot be run locally. (The token select that used to be
  // on it is gone; a colour is assigned by seat.)
  await page.goto('./#/host');
  await page.getByTestId(TEST_IDS.openTableButton).click();
  await expect(page.getByTestId(TEST_IDS.lobbyPanel)).toBeVisible({ timeout: 20000 });
  return (await page.getByTestId(TEST_IDS.lobbyInviteLink).inputValue()).replace(
    /^https?:\/\/[^/]+/,
    ''
  );
};

/**
 * Following an invitation, which is now the JOIN screen rather than the lobby.
 *
 * One door: a code read out loud and a link clicked cold reach the same screen,
 * which takes the code and the name together and seats you. The lobby that
 * follows has no form on it at all.
 */
const asSecondDevice = async (
  context: BrowserContext,
  link: string,
  name: string
): Promise<Page> => {
  const page = await context.newPage();
  await page.goto(link);
  // The code rides in the link, so only the name is left to give.
  await expect(page.getByTestId(TEST_IDS.joinCodeInput)).not.toHaveValue('');
  await page.getByTestId(TEST_IDS.joinNameInput).fill(name);
  await page.getByTestId(TEST_IDS.joinSubmitButton).click();
  await expect(page.getByTestId(TEST_IDS.lobbyPanel)).toBeVisible({ timeout: 20000 });
  return page;
};

test('two devices join one table, and only one of them can act', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();

  const link = await hostATable(host);
  // Seated on the way in, and the host sees it arrive without a refresh.
  const guest = await asSecondDevice(guestContext, link, 'Vikram');
  await expect(host.getByTestId(TEST_IDS.lobbySeat)).toHaveCount(2, { timeout: 20000 });

  // Only the person who opened the table is offered a start. This used to be
  // one button on both devices, live for whoever clicked first.
  await expect(guest.getByTestId(TEST_IDS.lobbyStartButton)).toHaveCount(0);
  await expect(guest.getByTestId(TEST_IDS.lobbyBlockedReason)).toContainText(/host/i);

  // The host starts, and the guest is carried into the game by the same bell.
  await host.getByTestId(TEST_IDS.lobbyStartButton).click();
  await expect(host.getByTestId(TEST_IDS.boardGrid)).toBeVisible({ timeout: 20000 });
  await expect(guest.getByTestId(TEST_IDS.boardGrid)).toBeVisible({ timeout: 20000 });

  // The headline assertion: exactly one device can roll.
  const hostCanRoll = await host.getByTestId(TEST_IDS.rollButton).isEnabled();
  const guestCanRoll = await guest.getByTestId(TEST_IDS.rollButton).isEnabled();
  expect(hostCanRoll).not.toBe(guestCanRoll);

  // And a move on one device reaches the other.
  const roller = hostCanRoll ? host : guest;
  const watcher = hostCanRoll ? guest : host;
  const before = await watcher
    .getByTestId(TEST_IDS.gameLayout)
    .getAttribute('data-moving');
  expect(before).toBe('false');

  await roller.getByTestId(TEST_IDS.rollButton).click();
  await expect(watcher.getByTestId(TEST_IDS.gameLayout)).toHaveAttribute(
    'data-moving',
    'true',
    { timeout: 20000 }
  );

  await hostContext.close();
  await guestContext.close();
});
