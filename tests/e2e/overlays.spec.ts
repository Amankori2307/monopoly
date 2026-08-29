import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

// The main screen stays to the board, players, and turn controls. Holdings and
// the activity log moved behind overlays so nothing competes with the board.
test('keeps holdings and the activity log off the main screen', async ({ page }) => {
  await startGame(page);

  await expect(page.getByTestId(TEST_IDS.holdingsPanel)).toHaveCount(0);
  await expect(page.getByTestId(TEST_IDS.activityPanel)).toHaveCount(0);
  await expect(page.getByTestId(TEST_IDS.activityDrawer)).toHaveCount(0);
  await expect(page.getByTestId(TEST_IDS.activityButton)).toBeVisible();
});

test('opens the activity log in a drawer from the floating button', async ({ page }) => {
  await startGame(page);

  await page.getByTestId(TEST_IDS.activityButton).click();

  const drawer = page.getByTestId(TEST_IDS.activityDrawer);
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('started with 2 players');

  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
});

test("opens a player's holdings by clicking their card", async ({ page }) => {
  await startGame(page);

  await page.getByTestId(TEST_IDS.playerStackExpand).click();
  await page
    .getByRole('button', { name: /View .* details/ })
    .first()
    .click();

  const drawer = page.getByTestId(TEST_IDS.playerDetailDrawer);
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Holdings');

  await page.getByTestId(TEST_IDS.drawerClose).click();
  await expect(drawer).toHaveCount(0);
});

// A pending decision must block the board rather than sit beside it, and it has
// no dismiss affordance because the turn cannot advance until it is answered.
//
// Dice are real random here, so a single roll may land on a space that raises no
// decision (Chance, a tax, an owned property). Roll through turns until one
// appears rather than assuming the first roll produces it.
test('shows a pending decision as a blocking centre modal', async ({ page }) => {
  await startGame(page);

  const modal = page.getByTestId(TEST_IDS.decisionModal);
  const rollButton = page.getByTestId(TEST_IDS.rollButton);
  const endTurnButton = page.getByTestId(TEST_IDS.endTurnButton);

  const MAX_ROLLS = 12;
  for (let attempt = 0; attempt < MAX_ROLLS; attempt += 1) {
    if (await modal.isVisible()) {
      break;
    }
    if (await rollButton.isEnabled()) {
      await rollButton.click();
      await page.waitForTimeout(700);
    } else if (await endTurnButton.isVisible()) {
      await endTurnButton.click();
    } else {
      break;
    }
  }

  await expect(modal).toBeVisible();
  await expect(modal).toContainText(/Buy or auction|Auction|Jail choice|liquidation/i);

  // Not dismissible: Escape leaves it in place.
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible();
});

// Rolling can raise a blocking decision modal, which would intercept a click on
// the activity button. Assert on the button's own event count instead - it is
// readable without interacting with anything the modal covers.
test('rolls the dice and records the roll', async ({ page }) => {
  await startGame(page);

  const activityButton = page.getByTestId(TEST_IDS.activityButton);
  const eventCount = async () =>
    Number((await activityButton.getAttribute('aria-label'))?.match(/(\d+) events/)?.[1]);

  await expect(page.getByTestId(TEST_IDS.diceDock)).toBeVisible();
  const before = await eventCount();

  await page.getByTestId(TEST_IDS.rollButton).click();

  // The roll animation commits to the engine, which then logs the roll.
  await expect.poll(eventCount).toBeGreaterThan(before);
});
