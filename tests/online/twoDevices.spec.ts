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
  await page.goto('./');
  await page.getByTestId(TEST_IDS.playOnlineButton).click();
  await expect(page.getByTestId(TEST_IDS.lobbyPanel)).toBeVisible({ timeout: 20000 });
  return (await page.getByTestId(TEST_IDS.lobbyInviteLink).inputValue()).replace(
    /^https?:\/\/[^/]+/,
    ''
  );
};

const asSecondDevice = async (context: BrowserContext, link: string): Promise<Page> => {
  const page = await context.newPage();
  await page.goto(link);
  await expect(page.getByTestId(TEST_IDS.lobbyPanel)).toBeVisible({ timeout: 20000 });
  return page;
};

test('two devices join one table, and only one of them can act', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();

  const link = await hostATable(host);
  const guest = await asSecondDevice(guestContext, link);

  // The guest takes a seat, and the host sees it arrive without a refresh.
  await guest.getByTestId(TEST_IDS.lobbyNameInput).fill('Vikram');
  await guest.getByTestId(TEST_IDS.lobbyTokenSelect).selectOption({ index: 2 });
  await guest.getByTestId(TEST_IDS.lobbyClaimButton).click();
  await expect(host.getByTestId(TEST_IDS.lobbySeat)).toHaveCount(2, { timeout: 20000 });

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
