import { expect, test, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { advanceGame, startGame } from './helpers';

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

// The buy decision reuses the same SpaceCard the board shows, so a player
// decides against the full deed rather than a bare name and price.
/** Dice are real random, so play on until a buy decision comes up. */
const reachBuyDecision = async (page: Page) => {
  const buyButton = page.getByTestId(TEST_IDS.buyButton);
  const rollButton = page.getByTestId(TEST_IDS.rollButton);
  const endTurnButton = page.getByTestId(TEST_IDS.endTurnButton);
  const payFine = page.getByRole('button', { name: /^Pay M/ });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await buyButton.isVisible()) {
      return;
    }
    if (await payFine.isVisible()) {
      await payFine.click();
    } else if (await rollButton.isEnabled()) {
      await rollButton.click();
      await page.waitForTimeout(700);
    } else if (await endTurnButton.isVisible()) {
      await endTurnButton.click();
    } else {
      break;
    }
  }
};

test('shows the full title deed inside the buy decision', async ({ page }) => {
  await startGame(page);
  await reachBuyDecision(page);

  const buyButton = page.getByTestId(TEST_IDS.buyButton);
  await expect(buyButton).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.declineButton)).toBeVisible();

  // The deed itself, not just a price.
  const card = page.getByTestId(TEST_IDS.spaceCard);
  await expect(card).toBeVisible();
  await expect(card).toContainText('Mortgage value');
  await expect(buyButton).toContainText(/Buy for M\d+/);

  // Two columns: site card on one side, the choice on the other.
  const [cardBox, choiceBox] = await Promise.all([
    card.boundingBox(),
    page.locator('.buy-decision-choice').boundingBox(),
  ]);
  if (!cardBox || !choiceBox) {
    throw new Error('Buy decision columns have no layout box');
  }
  expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(choiceBox.x + 1);
});

// The decision surface used to be tinted cream and ringed in red, so the same
// deed looked different depending on where it appeared. It is a plain white
// card like every other panel.
test('shows the buy decision on a plain white card', async ({ page }) => {
  await startGame(page);
  await reachBuyDecision(page);

  const surface = page.locator('.decision-card');
  await expect(surface).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  // No accent-coloured ring.
  const border = await surface.evaluate((el) => getComputedStyle(el).borderColor);
  expect(border).not.toMatch(/rgb\(20[0-9], |rgb\(19[0-9], /);
});

// Primary is blue and secondary is neutral, both from theme tokens - the buy
// button used to be red.
test('uses themed primary and secondary buttons, side by side at the bottom', async ({
  page,
}) => {
  await startGame(page);
  await reachBuyDecision(page);

  const buy = page.getByTestId(TEST_IDS.buyButton);
  const decline = page.getByTestId(TEST_IDS.declineButton);

  const [buyBg, declineBg] = await Promise.all([
    buy.evaluate((el) => getComputedStyle(el).backgroundColor),
    decline.evaluate((el) => getComputedStyle(el).backgroundColor),
  ]);
  const [primary, secondary] = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return [
      style.getPropertyValue('--button-primary').trim(),
      style.getPropertyValue('--button-secondary').trim(),
    ];
  });

  const toRgb = (hex: string) => {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
    const int = parseInt(full, 16);
    return `rgb(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255})`;
  };
  expect(buyBg).toBe(toRgb(primary));
  expect(declineBg).toBe(toRgb(secondary));

  // Side by side, not stacked, and pinned to the bottom of their column.
  const [buyBox, declineBox, choiceBox] = await Promise.all([
    buy.boundingBox(),
    decline.boundingBox(),
    page.locator('.buy-decision-choice').boundingBox(),
  ]);
  if (!buyBox || !declineBox || !choiceBox) {
    throw new Error('Buy decision buttons have no layout box');
  }
  expect(Math.abs(buyBox.y - declineBox.y)).toBeLessThanOrEqual(1);
  expect(buyBox.x + buyBox.width).toBeLessThanOrEqual(declineBox.x + 1);
  // Bottom-aligned within the choice column.
  expect(buyBox.y + buyBox.height).toBeGreaterThan(choiceBox.y + choiceBox.height * 0.6);
});

// Regression: a Chance card could jail a player mid-doubles, leaving them able
// to roll while in jail. The engine rejected that roll by throwing, the throw
// escaped the dice commit callback, and the dock stuck on "Rolling..." forever.
//
// Plays a long stretch of real turns and fails if the dock ever fails to settle
// or the engine rejects a command the UI offered.
test('never strands the dice on Rolling through a long game', async ({ page }) => {
  await startGame(page);

  const rollButton = page.getByTestId(TEST_IDS.rollButton);
  const endTurnButton = page.getByTestId(TEST_IDS.endTurnButton);
  const declineButton = page.getByTestId(TEST_IDS.declineButton);
  const payFineButton = page.getByRole('button', { name: /^Pay M/ });

  for (let turn = 0; turn < 60; turn += 1) {
    // The dock must always settle back out of its rolling state.
    await expect
      .poll(async () => (await rollButton.textContent())?.trim(), { timeout: 4000 })
      .not.toBe('Rolling…');

    if (await declineButton.isVisible()) {
      await declineButton.click();
    } else if (await payFineButton.isVisible()) {
      await payFineButton.click();
    } else if (await rollButton.isEnabled()) {
      await rollButton.click();
      await page.waitForTimeout(650);
    } else if (await endTurnButton.isVisible()) {
      await endTurnButton.click();
    } else {
      // Nothing actionable (e.g. an auction is open) - stop rather than spin.
      break;
    }
  }

  // The UI must never offer an action the engine then rejects.
  await expect(page.getByTestId(TEST_IDS.commandError)).toHaveCount(0);
});

// Regression: a jailed player whose `pendingDecision` had drifted was offered no
// action at all - no roll, no jail choice, no end turn. The game was unplayable
// with nothing on screen explaining why.
test('always leaves the player at least one action', async ({ page }) => {
  await startGame(page);

  const anyActionAvailable = async () => {
    const enabled = await page
      .locator('button:not([disabled])')
      .filter({
        hasText:
          /Roll dice|Roll for doubles|Done|Take extra roll|Buy|Decline|Pay M|Use jail card|Submit bid|Pass/,
      })
      .count();
    return enabled > 0;
  };

  for (let turn = 0; turn < 40; turn += 1) {
    // Polled, not asserted instantly: while a token walks to its space the
    // decision is deliberately withheld, so an action can be momentarily
    // absent. A real deadlock never resolves.
    await expect
      .poll(anyActionAvailable, {
        timeout: 5000,
        message: 'the player must always end up with at least one action',
      })
      .toBe(true);

    const rollButton = page.getByTestId(TEST_IDS.rollButton);
    const endTurnButton = page.getByTestId(TEST_IDS.endTurnButton);
    const declineButton = page.getByTestId(TEST_IDS.declineButton);
    const payFine = page.getByRole('button', { name: /^Pay M/ });
    const passAuction = page.getByRole('button', { name: 'Pass' });

    if (await declineButton.isVisible()) {
      await declineButton.click();
    } else if (await passAuction.isVisible()) {
      await passAuction.click();
    } else if (await payFine.isVisible()) {
      await payFine.click();
    } else if (await rollButton.isEnabled()) {
      await rollButton.click();
      await page.waitForTimeout(650);
    } else if (await endTurnButton.isVisible()) {
      await endTurnButton.click();
    }
  }

  // A deadlock is logged as an error; the log must stay clean.
  const loggedErrors = await page.evaluate(() => {
    const handle = (window as unknown as { monopolyLog?: { errors: () => unknown[] } })
      .monopolyLog;
    return handle ? handle.errors().length : 0;
  });
  expect(loggedErrors).toBe(0);
});

// The decision modal used to appear the instant the engine resolved the roll,
// covering the board while the token was still walking to the space.
test('opens the buy decision only after the token finishes moving', async ({ page }) => {
  await startGame(page);

  const declineButton = page.getByTestId(TEST_IDS.declineButton);
  const rollButton = page.getByTestId(TEST_IDS.rollButton);

  const tokenSnapshot = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('.board-token-layer .token-chip'))
        .map((token) => {
          const element = token as HTMLElement;
          return `${element.style.left},${element.style.top}`;
        })
        .join('|')
    );

  /** Rolls once, returning when the token last moved and when the modal appeared. */
  const rollAndWatch = async () => {
    let previous = await tokenSnapshot();
    let lastMoveAt: number | null = null;
    let firstModalAt: number | null = null;

    await rollButton.click();
    for (let sample = 0; sample < 100; sample += 1) {
      await page.waitForTimeout(40);
      const now = await tokenSnapshot();
      if (now !== previous) {
        previous = now;
        lastMoveAt = sample * 40;
      }
      if (firstModalAt === null && (await declineButton.isVisible())) {
        firstModalAt = sample * 40;
      }
    }
    return { lastMoveAt, firstModalAt };
  };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (!(await rollButton.isEnabled())) {
      if ((await advanceGame(page)) === 'none') break;
      continue;
    }

    const { lastMoveAt, firstModalAt } = await rollAndWatch();

    // Only meaningful when the token actually walked and a decision followed.
    if (lastMoveAt !== null && firstModalAt !== null) {
      expect(
        firstModalAt,
        `modal at ${firstModalAt}ms, last token move at ${lastMoveAt}ms`
      ).toBeGreaterThan(lastMoveAt);
      return;
    }

    await advanceGame(page);
  }
});
