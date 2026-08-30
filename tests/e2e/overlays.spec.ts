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
    .getByRole('button', { name: /View .* holdings/ })
    .first()
    .click();

  const drawer = page.getByTestId(TEST_IDS.playerDetailDrawer);
  await expect(drawer).toBeVisible();
  // Grouped sections replaced the old flat "Holdings" list; a fresh game owns
  // nothing, so the empty state shows alongside the headline stats.
  await expect(drawer).toContainText('Net worth');
  await expect(drawer).toContainText('No owned assets yet.');

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

// Holdings are public information on a physical board, so any player's
// portfolio can be inspected - not just the one whose turn it is.
test("opens any player's holdings from any player card", async ({ page }) => {
  await startGame(page);

  // Expand the stack so every card's own control is reachable.
  await page.getByTestId(TEST_IDS.playerStackExpand).click();

  const openButtons = page.getByRole('button', { name: /View .* holdings/ });
  const count = await openButtons.count();
  expect(count).toBeGreaterThan(1);

  // The second card is not the active player, and must still open.
  await openButtons.nth(1).click();

  const drawer = page.getByTestId(TEST_IDS.playerDetailDrawer);
  await expect(drawer).toBeVisible();
  // Board position is deliberately absent.
  await expect(drawer).not.toContainText('Position');
  await expect(drawer).toContainText('Net worth');
});

// The site card is one fixed object. It must measure identically in the deed
// modal and in the holdings drawer - if the two ever drift, the drawer has
// started restyling a card it is only supposed to be positioning.
// Mirrors $deed-card-width / $deed-card-height / $holdings-peek / $drawer-pad
// in src/styles/abstracts/_tokens.scss.
const DEED_CARD_WIDTH = 340;
const DEED_CARD_HEIGHT = 380;
const HOLDINGS_PEEK = 78;
/** The card's own 1px border, inside its width and height box. */
const CARD_BORDER = 1;
const DRAWER_PAD = 28;
/** The drawer's border-left is inside its width box, like the padding. */
const DRAWER_BORDER = 1;

/** Give the first player a few streets so there is a stack worth looking at. */
const seedHoldings = async (page: Page) => {
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('monopoly.game.'));
    if (!key) return;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const player = game.playerOrder[0];
    game.board
      .filter((space: { kind: string }) => space.kind === 'street')
      .slice(0, 3)
      .forEach((space: { id: string }) => {
        game.ownership[space.id].ownerPlayerId = player;
      });
    localStorage.setItem(key, JSON.stringify(game));
  });
  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
};

const openFirstPlayerHoldings = async (page: Page) => {
  await page.getByTestId(TEST_IDS.playerStackExpand).click();
  await page
    .getByRole('button', { name: /View .* holdings/ })
    .first()
    .click();
};

test('renders the site card at one fixed size in the drawer and the modal', async ({
  page,
}) => {
  await startGame(page);
  await seedHoldings(page);

  // The deed modal, for reference: this is the card everywhere else must match.
  await page.getByRole('button', { name: 'View details for Delhi', exact: true }).click();
  const modalCard = page.getByTestId(TEST_IDS.spaceDetailCard).getByTestId(TEST_IDS.spaceCard);
  await expect(modalCard).toBeVisible();
  const modalBox = await modalCard.boundingBox();
  await page.keyboard.press('Escape');

  await openFirstPlayerHoldings(page);

  const drawer = page.getByTestId(TEST_IDS.playerDetailDrawer);
  const featured = page
    .getByTestId(TEST_IDS.holdingsFeatured)
    .getByTestId(TEST_IDS.spaceCard);
  await expect(featured).toBeVisible();

  const [drawerBox, featuredBox] = await Promise.all([
    drawer.boundingBox(),
    featured.boundingBox(),
  ]);
  if (!modalBox || !drawerBox || !featuredBox) {
    throw new Error('Cards have no layout box');
  }

  for (const box of [modalBox, featuredBox]) {
    expect(Math.round(box.width)).toBe(DEED_CARD_WIDTH);
    expect(Math.round(box.height)).toBe(DEED_CARD_HEIGHT);
  }

  // The colour strip is the card's top edge: flush to the top, bleeding the
  // full width. If the card's padding and the strip's negative margin ever
  // stop being derived from one token, this is what catches it.
  const bandBox = await featured.getByTestId(TEST_IDS.deedBand).boundingBox();
  if (!bandBox) {
    throw new Error('Colour strip has no layout box');
  }
  expect(Math.round(bandBox.y - featuredBox.y)).toBe(CARD_BORDER);
  expect(Math.round(bandBox.width)).toBe(DEED_CARD_WIDTH - 2 * CARD_BORDER);

  // The drawer is sized by its card, not the other way round...
  expect(Math.round(drawerBox.width)).toBe(
    DEED_CARD_WIDTH + 2 * DRAWER_PAD + DRAWER_BORDER
  );
  // ...and the card sits evenly between its two edges.
  const leftGap = featuredBox.x - drawerBox.x - DRAWER_BORDER;
  const rightGap = drawerBox.x + drawerBox.width - (featuredBox.x + featuredBox.width);
  expect(Math.round(leftGap)).toBe(DRAWER_PAD);
  expect(Math.round(rightGap)).toBe(DRAWER_PAD);
});

// The stacked deeds are the same card, clipped to a peek - not a smaller card.
test('stacks holdings as full-width deeds clipped to a peek', async ({ page }) => {
  await startGame(page);
  await seedHoldings(page);
  await openFirstPlayerHoldings(page);

  const stack = page.getByTestId(TEST_IDS.holdingsStack);
  const stackCards = stack.locator(`[data-testid^="${TEST_IDS.holdingsStackCard}-"]`);
  await expect(stackCards.first()).toBeVisible();
  await expect(stackCards).toHaveCount(3);

  const stackedBox = await stackCards.first().boundingBox();
  if (!stackedBox) {
    throw new Error('Stacked holding has no layout box');
  }

  expect(Math.round(stackedBox.width)).toBe(DEED_CARD_WIDTH);
  expect(Math.round(stackedBox.height)).toBe(HOLDINGS_PEEK);
});

// Picking a stacked deed promotes it, and it stays in the deck - so the stack
// never changes length and nothing shifts underneath the pointer.
test('promotes a stacked holding without removing it from the deck', async ({ page }) => {
  await startGame(page);
  await seedHoldings(page);
  await openFirstPlayerHoldings(page);

  const stack = page.getByTestId(TEST_IDS.holdingsStack);
  const stackCards = stack.locator(`[data-testid^="${TEST_IDS.holdingsStackCard}-"]`);
  await expect(stackCards).toHaveCount(3);

  const second = stack.getByRole('button', { name: /^Show / }).nth(1);
  const label = (await second.getAttribute('aria-label')) as string;
  const name = label.replace('Show ', '');
  await second.click();

  await expect(page.getByTestId(TEST_IDS.holdingsFeatured)).toContainText(name);
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(stackCards).toHaveCount(3);
});

// Below the mobile breakpoint a 420px card cannot fit, so it - and the drawer
// derived from it - go fluid rather than forcing a sideways scroll.
test('relaxes the card to full width on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await startGame(page);
  await seedHoldings(page);
  await openFirstPlayerHoldings(page);

  const featured = page
    .getByTestId(TEST_IDS.holdingsFeatured)
    .getByTestId(TEST_IDS.spaceCard);
  await expect(featured).toBeVisible();

  const box = await featured.boundingBox();
  if (!box) {
    throw new Error('Featured holding has no layout box');
  }

  expect(box.width).toBeLessThanOrEqual(390);
  // No sideways scroll: the page never grows past the viewport.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
