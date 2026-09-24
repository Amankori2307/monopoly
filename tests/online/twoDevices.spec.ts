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

/**
 * Getting up from a table, and the chair the host leaves behind.
 *
 * Only provable here. A departure is a server write whose whole point is what
 * the OTHER devices see, and the transfer rule lives in SQL - a mocked
 * `leave_seat` would assert that this app sends what it sends, which the unit
 * tests already do, and nothing at all about migration 0006.
 *
 * Three devices rather than two, deliberately: the successor has to be able to
 * actually START, and two seats minus a host is one seat, which is below
 * MIN_PLAYERS. A two-device version would prove the button appears and never
 * that it works.
 */
test('a guest can leave, and the host sees the chair empty', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();

  const link = await hostATable(host);
  const guest = await asSecondDevice(guestContext, link, 'Vikram');
  await expect(host.getByTestId(TEST_IDS.lobbySeat)).toHaveCount(2, { timeout: 20000 });

  await guest.getByTestId(TEST_IDS.lobbyLeaveButton).click();

  // The person leaving ends up somewhere they can start again, rather than on
  // a table they are no longer at.
  await expect(guest.getByTestId(TEST_IDS.lobbyPanel)).toHaveCount(0, { timeout: 20000 });

  // And the host learns about it from the BELL. `leave_seat` bumps the revision
  // but writes nothing through `publish`, so without the announce this only
  // arrives when the 30s poll comes round - which is why the timeout here is
  // deliberately well under thirty seconds.
  await expect(host.getByTestId(TEST_IDS.lobbySeat)).toHaveCount(1, { timeout: 15000 });

  await hostContext.close();
  await guestContext.close();
});

test('the host can leave, and the chair passes to whoever arrived next', async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const host = await hostContext.newPage();

  const link = await hostATable(host);
  const first = await asSecondDevice(firstContext, link, 'Vikram');
  const second = await asSecondDevice(secondContext, link, 'Meera');
  await expect(host.getByTestId(TEST_IDS.lobbySeat)).toHaveCount(3, { timeout: 20000 });

  // Neither guest can start while the host is here.
  await expect(first.getByTestId(TEST_IDS.lobbyStartButton)).toHaveCount(0);

  await host.getByTestId(TEST_IDS.lobbyLeaveButton).click();
  await expect(first.getByTestId(TEST_IDS.lobbySeat)).toHaveCount(2, { timeout: 15000 });

  /**
   * The headline. Before this the table was simply dead: the chair still named
   * a device that had gone, and the secret proving that chair was on a laptop
   * nobody could reach - so two people sat looking at a game that could never
   * begin.
   *
   * It works because the transfer NULLS the secret in the same statement that
   * moves the seat. `start_game` checks the secret first, so a moved chair with
   * a live secret arms the strongest branch with a value nobody holds and the
   * device branch is never reached - a table more unstartable than the one the
   * transfer was fixing.
   */
  await expect(first.getByTestId(TEST_IDS.lobbyStartButton)).toBeEnabled({
    timeout: 20000,
  });
  // Exactly one successor, not everybody. The transfer names a seat; only the
  // "no host recorded at all" case fails open.
  await expect(second.getByTestId(TEST_IDS.lobbyStartButton)).toHaveCount(0);

  // And it is a real start, not a live-looking button.
  await first.getByTestId(TEST_IDS.lobbyStartButton).click();
  await expect(first.getByTestId(TEST_IDS.boardGrid)).toBeVisible({ timeout: 20000 });
  await expect(second.getByTestId(TEST_IDS.boardGrid)).toBeVisible({ timeout: 20000 });

  await hostContext.close();
  await firstContext.close();
  await secondContext.close();
});
