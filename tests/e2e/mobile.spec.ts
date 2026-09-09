import { expect, test, type Page } from '@playwright/test';
import { MAX_PLAYERS } from '../../src/domain/constants/game.constants';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { advanceGame, startGame, VIEWPORTS } from './helpers';

/**
 * The phone layout.
 *
 * Every assertion here is geometry or computed style, which is the only level
 * that can see a layout at all - jsdom does no layout, so a unit test cannot
 * tell whether the board fits on the screen.
 *
 * Two failures motivate the whole file. In landscape the board rendered 776px
 * tall inside a 375px-tall window, because below $breakpoint-board the board's
 * height cap was replaced by a plain width cap. And in portrait the board, the
 * player cards and the dice stacked into a 750px page, so you scrolled away
 * from the board to roll and back again to see what had happened.
 */

/** Every box the page paints, and whether any of it sits outside the window. */
const overflow = (page: Page) =>
  page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth - window.innerWidth,
    vertical: document.documentElement.scrollHeight - window.innerHeight,
  }));

const boxOf = async (page: Page, selector: string) => {
  const box = await page.evaluate((css) => {
    const rect = document.querySelector(css)?.getBoundingClientRect();
    return rect
      ? { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
      : null;
  }, selector);
  if (!box) {
    throw new Error(`No element matched ${selector}`);
  }
  return box;
};

const overlaps = (
  a: { top: number; right: number; bottom: number; left: number },
  b: { top: number; right: number; bottom: number; left: number }
) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// ---------------------------------------------------------------------------
// Portrait
// ---------------------------------------------------------------------------
test.describe('a phone in portrait', () => {
  test.use({ viewport: VIEWPORTS.phone });

  // The frame is a fixed-height app shell, so neither axis may scroll. Vertical
  // matters as much as horizontal here: a page that scrolls is a page where the
  // board and the dice are not both on screen, which is the bug.
  test('fits the whole game on screen with no page scroll', async ({ page }) => {
    await startGame(page);

    expect(await overflow(page)).toEqual({ horizontal: 0, vertical: 0 });
  });

  test('keeps the board and the roll button visible at the same time', async ({
    page,
  }) => {
    await startGame(page);

    const height = VIEWPORTS.phone.height;
    const board = await boxOf(page, '.board-card');
    const roll = await boxOf(page, `[data-testid="${TEST_IDS.rollButton}"]`);

    // The board is pinned at the top and the bar at the bottom, with neither
    // clipped and no scrolling needed to reach either.
    expect(board.top).toBeGreaterThanOrEqual(0);
    expect(board.bottom).toBeLessThanOrEqual(height);
    expect(roll.bottom).toBeLessThanOrEqual(height);
    expect(roll.top).toBeGreaterThan(board.bottom);
  });

  // The sidebar is the one scroll container and the bar is its sticky last
  // child, which is what makes this promise keepable without anyone having to
  // know the bar's height.
  //
  // Both stack states are checked, because the collapsed fan and the expanded
  // list are different heights and only the taller one is the real test.
  for (const stack of ['collapsed', 'expanded'] as const) {
    test(`lets the last player card clear the action bar, ${stack}`, async ({ page }) => {
      await startGame(page, { players: MAX_PLAYERS });

      if (stack === 'expanded') {
        await page.locator('.player-stack-expand').click();
        // The stack animates its max-height, which otherwise mismeasures.
        await page.waitForTimeout(600);
      }

      // The assertion that caught the bug this test was written for, stated
      // directly: the stack must CONTAIN its own cards. A flex item shrinks
      // before it overflows, so with the stack's own scroller released the
      // region was squeezed to the space available and its cards spilled out of
      // it, over the sticky bar, with nothing to scroll them clear with.
      //
      // Deliberately not "the sidebar overflows": whether it needs to scroll at
      // all depends on how tall the cards are, and a compact card that happens
      // to fit is a success rather than a regression.
      const squeeze = await page.evaluate(() => {
        const region = document.querySelector('.player-stack-region');
        return region ? region.scrollHeight - region.clientHeight : null;
      });
      expect(squeeze).toBeLessThanOrEqual(1);

      await page.evaluate(() => {
        const side = document.querySelector('.game-side');
        side?.scrollTo({ top: side.scrollHeight });
      });
      await page.waitForTimeout(400);

      const footer = await boxOf(page, '.game-side-footer');
      const cards = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.player-card')).map(
          (card) => card.getBoundingClientRect().bottom
        )
      );

      expect(cards.length).toBeGreaterThan(0);
      // Scrolled to the end, every card is clear of the bar.
      for (const bottom of cards) {
        expect(bottom).toBeLessThanOrEqual(footer.top + 1);
      }
    });
  }

  // It is `position: fixed` bottom-left on a desktop, which on a phone put it
  // exactly on top of the dice.
  test('puts the activity button in the bar rather than over it', async ({ page }) => {
    await startGame(page);

    const button = page.getByTestId(TEST_IDS.activityButton);
    await expect(button).toBeVisible();

    expect(await button.evaluate((element) => getComputedStyle(element).position)).toBe(
      'static'
    );

    const activity = await boxOf(page, `[data-testid="${TEST_IDS.activityButton}"]`);
    const roll = await boxOf(page, `[data-testid="${TEST_IDS.rollButton}"]`);
    expect(overlaps(activity, roll)).toBe(false);
  });

  // A 30px-wide square cannot hold a name at any size - it was set at 5px, which
  // is texture rather than type. What must NOT go with it is the square's
  // accessible name, which is an explicit aria-label on the button.
  test('drops the space names but keeps each square identifiable', async ({ page }) => {
    await startGame(page);

    const names = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.space-name')).map(
        (name) => getComputedStyle(name).display
      )
    );
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names)).toEqual(new Set(['none']));

    // The name is still how the square is addressed, and still one tap away.
    await expect(
      page.getByRole('button', { name: 'View details for Guwahati', exact: true })
    ).toBeVisible();

    // The colour ribbon and the glyphs are what identify a square now.
    expect(
      await page.evaluate(() => document.querySelectorAll('.space-color').length)
    ).toBe(22);
    expect(
      await page.evaluate(() => document.querySelectorAll('.space-icon').length)
    ).toBeGreaterThan(0);
  });

  /**
   * Four figures do not need 300px of card. This used to stack the name, a
   * labelled net worth, and then cash and sites one per line, because
   * `.player-metrics` shared the generic two-column grid that collapses to one
   * column below the tablet breakpoint - so the metrics alone were four rows.
   *
   * The number is a ceiling, not a measurement: it is here to fail if the card
   * ever goes back to a row per figure, not to pin the current design.
   */
  test('shows a player in a compact card rather than a screenful', async ({ page }) => {
    await startGame(page);

    const card = await boxOf(page, '.player-card');
    expect(card.bottom - card.top).toBeLessThan(130);

    // Compact, but still carrying all four facts.
    const text = await page.locator('.player-card').first().innerText();
    expect(text).toMatch(/Net worth/i);
    expect(text).toMatch(/Cash/i);
    expect(text).toMatch(/Owned/i);
  });

  /**
   * The control that opens a player's holdings was an empty, entirely unstyled
   * button - it rendered as a tiny default browser pill that read as a
   * rendering artefact. "Looks like a control" is testable: it has to be
   * visible, painted, and big enough to hit.
   */
  test('makes the holdings control look and behave like a control', async ({ page }) => {
    await startGame(page);

    // Collapsed, the stack's own overlay owns the click - a card's controls are
    // only reachable once it is expanded.
    await page.getByTestId(TEST_IDS.playerStackExpand).click();

    const open = page.getByRole('button', { name: /View .* holdings/ }).first();
    const chevron = page.locator('.player-card-chevron').first();
    await expect(chevron).toBeVisible();

    // Painted, rather than a transparent default button.
    const background = await chevron.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    );
    expect(background).not.toBe('rgba(0, 0, 0, 0)');

    // The whole card is the target, so the tap is comfortably over 44px.
    const box = await open.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThan(200);

    // And it actually opens the drawer.
    await open.click();
    await expect(page.getByTestId(TEST_IDS.playerDetailDrawer)).toBeVisible();
  });

  /**
   * The drawer's four figures are a 2x2 grid, not four full-width rows. I
   * collapsed them to one column while making the board responsive, which
   * turned them into about 340px of stats before the first deed - in a drawer
   * whose whole job is showing deeds.
   */
  test('keeps the player drawer stats to a compact grid', async ({ page }) => {
    await startGame(page);

    await page.getByTestId(TEST_IDS.playerStackExpand).click();
    await page
      .getByRole('button', { name: /View .* holdings/ })
      .first()
      .click();
    await expect(page.getByTestId(TEST_IDS.playerDetailDrawer)).toBeVisible();

    const stats = await boxOf(page, '.drawer-stats');
    expect(stats.bottom - stats.top).toBeLessThan(180);

    const columns = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('.drawer-stats') as Element)
          .gridTemplateColumns
    );
    // Two tracks, so the four figures sit two-by-two.
    expect(columns.split(' ').length).toBe(2);
  });

  /**
   * The dice must not touch the bottom edge.
   *
   * The sticky bar's only bottom spacing was `env(safe-area-inset-bottom)` with
   * no fallback, which resolves to 0 in Playwright, in DevTools emulation and on
   * any device without `viewport-fit=cover` - so a 58px button row sat flush
   * against the screen edge.
   */
  test('leaves a gap between the dice and the bottom of the screen', async ({ page }) => {
    await startGame(page);

    const gap = await page.evaluate(() => {
      const footer = document.querySelector('.game-side-footer') as HTMLElement;
      const controls = document.querySelector('.turn-controls') as HTMLElement;
      return (
        footer.getBoundingClientRect().bottom - controls.getBoundingClientRect().bottom
      );
    });

    expect(gap).toBeGreaterThanOrEqual(8);
  });

  /**
   * The log is chrome, so it is in the header - it used to share the bar with
   * the dice, which is the tightest row on the screen and wrapped to two lines
   * whenever End turn was showing.
   */
  test('keeps the activity log in the header, out of the dice bar', async ({ page }) => {
    await startGame(page);

    const button = page.getByTestId(TEST_IDS.activityButton);
    await expect(button).toBeVisible();

    const [activity, header, controls] = await Promise.all([
      button.boundingBox(),
      page.getByTestId(TEST_IDS.appHeader).boundingBox(),
      page.locator('.turn-controls').boundingBox(),
    ]);
    if (!activity || !header || !controls) {
      throw new Error('The activity button, the header or the bar has no layout box');
    }

    // Inside the header, and nowhere near the dice.
    expect(activity.y).toBeGreaterThanOrEqual(header.y - 1);
    expect(activity.y + activity.height).toBeLessThanOrEqual(
      header.y + header.height + 1
    );
    expect(activity.y).toBeLessThan(controls.y);

    // Still opens the drawer.
    await button.click();
    await expect(page.getByTestId(TEST_IDS.activityDrawer)).toBeVisible();
  });

  test('gives every control in the bar a 44px touch target', async ({ page }) => {
    await startGame(page);

    const heights = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>('.turn-controls button')
      ).map((button) => Math.round(button.getBoundingClientRect().height))
    );

    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) {
      expect(height).toBeGreaterThanOrEqual(44);
    }
  });

  // The layout is only worth anything if the game is still playable through it.
  test('plays a turn through the phone layout', async ({ page }) => {
    await startGame(page);

    expect(await advanceGame(page)).toBe('rolled');

    // Whatever the roll produced - a purchase, a card, a plain move - the frame
    // must still hold, with the decision surface inside the window.
    for (let step = 0; step < 6; step += 1) {
      const measured = await overflow(page);
      expect(measured.horizontal).toBe(0);
      if ((await advanceGame(page)) === 'none') {
        break;
      }
    }
  });

  /**
   * The frame breathes, and it breathes evenly.
   *
   * It did not. The board ran edge to edge and sat directly against the
   * header's bottom border, which is what made a dense screen read as a
   * cramped one - and the player cards were 4px narrower than the board above
   * them, because the stack reserves a gutter on ONE side for the fan's
   * outermost card. On a phone both edges are in view at once, so that showed.
   */
  test('insets the board evenly and clears the header', async ({ page }) => {
    await startGame(page);

    const width = page.viewportSize()?.width ?? 0;
    const header = await boxOf(page, '.app-header');
    const board = await boxOf(page, '.board-card');

    // Air under the header, not a board welded to its border.
    expect(board.top - header.bottom).toBeGreaterThanOrEqual(8);

    // And the same air either side.
    expect(board.left).toBeGreaterThanOrEqual(8);
    expect(board.left).toBe(width - board.right);

    // Every stacked element shares those edges. The board is the widest thing
    // on the screen, so anything narrower reads as misaligned rather than as
    // inset - which is what the stack's one-sided gutter was doing.
    for (const selector of ['.player-card', '.game-side-footer']) {
      const box = await boxOf(page, selector);
      expect(box.left, `${selector} left edge`).toBe(board.left);
      expect(box.right, `${selector} right edge`).toBe(board.right);
    }
  });

  test('keeps a decision modal inside the window', async ({ page }) => {
    await startGame(page);

    // Play on until something asks a question. Dice are real random.
    for (let step = 0; step < 20; step += 1) {
      if (await page.getByTestId(TEST_IDS.declineButton).isVisible()) {
        break;
      }
      if ((await advanceGame(page, { declineBuys: false })) === 'none') {
        break;
      }
    }
    await expect(page.getByTestId(TEST_IDS.declineButton)).toBeVisible();

    const modal = await boxOf(page, '.decision-modal');
    expect(modal.left).toBeGreaterThanOrEqual(0);
    expect(modal.right).toBeLessThanOrEqual(VIEWPORTS.phone.width);
    // Taller than the window is allowed - the modal scrolls internally - but it
    // may not be wider, and its top must be reachable.
    expect(modal.top).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// The narrowest supported width
// ---------------------------------------------------------------------------
test.describe('a 320px phone', () => {
  test.use({ viewport: VIEWPORTS.phoneSmall });

  // `body { min-width: 320px }` is the floor the reset commits to.
  test('does not scroll sideways at the narrowest supported width', async ({ page }) => {
    await startGame(page);

    expect((await overflow(page)).horizontal).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Landscape
// ---------------------------------------------------------------------------
test.describe('a phone held sideways', () => {
  test.use({ viewport: VIEWPORTS.phoneLandscape });

  // The regression this file exists for: a 776x776 board in a 375px-tall window.
  test('fits the board inside the window height', async ({ page }) => {
    await startGame(page);

    const board = await boxOf(page, '.board-card');

    expect(board.top).toBeGreaterThanOrEqual(0);
    expect(board.bottom).toBeLessThanOrEqual(VIEWPORTS.phoneLandscape.height);
    expect(await overflow(page)).toEqual({ horizontal: 0, vertical: 0 });
  });

  // A wide, short window is the one shape the two-column layout genuinely suits.
  test('puts the sidebar beside the board rather than below it', async ({ page }) => {
    await startGame(page);

    const board = await boxOf(page, '.board-card');
    const sidebar = await boxOf(page, '.game-side');

    expect(board.right).toBeLessThanOrEqual(sidebar.left + 1);
    // Beside, not below: they share the same band of the window.
    expect(sidebar.top).toBeLessThan(board.bottom);
  });

  test('keeps the roll button reachable without scrolling', async ({ page }) => {
    await startGame(page);

    const roll = await boxOf(page, `[data-testid="${TEST_IDS.rollButton}"]`);

    expect(roll.top).toBeGreaterThanOrEqual(0);
    expect(roll.bottom).toBeLessThanOrEqual(VIEWPORTS.phoneLandscape.height);
  });

  /**
   * The names are hidden by a CONTAINER query on the board, not a media query
   * on the viewport, and this is the case that forces the distinction.
   *
   * Landscape sizes the board by viewport HEIGHT, so this window is 844px wide
   * with a ~380px board - every bit as small as the portrait one. A
   * viewport-width rule reported "not a phone" and left 6.72px names on it.
   */
  test('hides the names on a small board even in a wide window', async ({ page }) => {
    await startGame(page);

    const board = await page.evaluate(
      () => document.querySelector('.board-card')?.getBoundingClientRect().width ?? 0
    );

    // The window is far wider than any phone breakpoint, and the board is not.
    expect(page.viewportSize()?.width).toBeGreaterThan(720);
    expect(board).toBeLessThan(520);

    const names = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.space-name')).map(
        (name) => getComputedStyle(name).display
      )
    );
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names)).toEqual(new Set(['none']));
  });
});

// ---------------------------------------------------------------------------
// The other side of that threshold
// ---------------------------------------------------------------------------
test.describe('a desktop board', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  // The container query has to be a threshold, not a one-way trip: a board with
  // the room for its names must still show them.
  test('still sets the names on a board with room for them', async ({ page }) => {
    await startGame(page);

    const board = await page.evaluate(
      () => document.querySelector('.board-card')?.getBoundingClientRect().width ?? 0
    );
    expect(board).toBeGreaterThan(520);

    await expect(page.locator('.space-label .space-name').first()).toBeVisible();
  });
});
