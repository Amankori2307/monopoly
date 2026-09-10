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
  // Two table sizes rather than two stack states: the phone HUD is a grid with
  // no fan to expand, so `.player-stack-expand` is not rendered there any
  // more. A full table is what makes the column tall, which was always the
  // point of checking the expanded case.
  for (const players of [2, MAX_PLAYERS] as const) {
    test(`lets the last player card clear the action bar, ${players} players`, async ({
      page,
    }) => {
      await startGame(page, { players });

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

  /**
   * A square says what it is and what it costs, at phone size.
   *
   * This test used to assert the opposite - that every name computed
   * `display: none` below a 520px board, because "a 30px-wide square cannot
   * hold a name at any size". The geometry says otherwise: rows 1 and 11 are
   * 1.7fr DEEP against 1fr wide, so the square is ~30x51 and two runs of type
   * fit side by side across those 30px. What it left behind was a street with
   * a colour ribbon, a dot, and nothing else at all - streets carry no glyph.
   */
  test('names and prices every square, and clips none of it', async ({ page }) => {
    await startGame(page);

    const board = await page.evaluate(
      () => document.querySelector('.board-card')?.getBoundingClientRect().width ?? 0
    );

    const measured = await page.evaluate(() => {
      const clipped: string[] = [];
      let names = 0;
      let prices = 0;
      let smallest = Infinity;

      document.querySelectorAll('.board-space').forEach((cell) => {
        const cellBox = cell.getBoundingClientRect();
        cell
          .querySelectorAll('.space-name, .space-name-short, .space-price')
          .forEach((element) => {
            const style = getComputedStyle(element);
            // Skip what is not being read: the swapped-out long name, and the
            // Jail band's label, which is a 1px clip-path box on purpose so it
            // stays in the accessible string.
            if (style.display === 'none' || style.clipPath !== 'none') return;
            if (element.clientWidth <= 1) return;

            if (element.classList.contains('space-price')) prices += 1;
            else names += 1;
            smallest = Math.min(smallest, Number.parseFloat(style.fontSize));

            const box = element.getBoundingClientRect();
            const overflowsItself =
              element.scrollWidth > element.clientWidth + 1 ||
              element.scrollHeight > element.clientHeight + 1;
            // Containment as well as self-overflow: a flex pair inside a
            // hidden-overflow cell can escape the LABEL while every child
            // still reports zero scroll.
            const escapesItsCell =
              box.left < cellBox.left - 0.5 ||
              box.right > cellBox.right + 0.5 ||
              box.top < cellBox.top - 0.5 ||
              box.bottom > cellBox.bottom + 0.5;

            if (overflowsItself || escapesItsCell) {
              clipped.push(`${element.textContent} (${element.className})`);
            }
          });
      });

      return { clipped, names, prices, smallest };
    });

    // Vacuity guards. The board must actually be small, and the text must
    // actually be there - the assertion this replaced passed for the wrong
    // reason on a phone precisely because display:none reports zero for both
    // scrollWidth and clientWidth.
    expect(board).toBeLessThan(520);
    expect(measured.names).toBeGreaterThanOrEqual(40);
    // 22 streets + 4 railways + 2 utilities + 2 taxes.
    expect(measured.prices).toBe(30);

    expect(measured.clipped).toEqual([]);

    // The legibility floor is the decision being reversed here, and the one
    // most easily eroded by a later tweak to the ramp.
    expect(measured.smallest).toBeGreaterThanOrEqual(5);

    // The name is still how the square is addressed, whatever is drawn in it.
    await expect(
      page.getByRole('button', { name: 'View details for Guwahati', exact: true })
    ).toBeVisible();

    expect(
      await page.evaluate(() => document.querySelectorAll('.space-color').length)
    ).toBe(22);
  });

  /**
   * Six squares a board carry a name too long to set in one: the four railways
   * and the two utilities. "Chennai Central Railway Station" is four wrapped
   * lines at ANY board size, and four lines plus a price does not fit above the
   * 5px floor. They print the edition's own word for what they are instead -
   * and the full name stays in the DOM, so the accessible name is untouched.
   */
  test('prints what the long squares ARE, in the edition own word', async ({ page }) => {
    await startGame(page);

    const swapped = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.board-space'))
        .filter((cell) => cell.querySelector('.space-name-short'))
        .map((cell) => ({
          label: cell.getAttribute('aria-label') ?? '',
          shortShown:
            getComputedStyle(cell.querySelector('.space-name-short')!).display !== 'none',
          fullHidden:
            getComputedStyle(cell.querySelector('.space-name.has-short')!).display ===
            'none',
        }))
    );

    expect(swapped).toHaveLength(6);
    swapped.forEach((square) => {
      expect(square.shortShown, square.label).toBe(true);
      expect(square.fullHidden, square.label).toBe(true);
    });

    // India calls them railway stations; the accessible name keeps the whole
    // thing either way.
    await expect(
      page.getByRole('button', {
        name: 'View details for Chennai Central Railway Station',
        exact: true,
      })
    ).toBeVisible();
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
    expect(card.bottom - card.top).toBeLessThan(80);

    // A name and one figure. The card is ~115px wide in the two-column HUD -
    // there is room for nothing else - and cash is the figure a player checks.
    const text = await page.locator('.player-card').first().innerText();
    expect(text).toMatch(/₹/);
    expect(text).not.toMatch(/Net worth/i);
    expect(text).not.toMatch(/Owned/i);
  });

  /**
   * The other half of that claim, and the one that makes dropping them
   * defensible: nothing was lost, it moved one tap away.
   */
  test('keeps the facts the card dropped, one tap away', async ({ page }) => {
    await startGame(page);

    await page
      .getByRole('button', { name: /View .* holdings/ })
      .first()
      .click();
    await expect(page.getByTestId(TEST_IDS.playerDetailDrawer)).toBeVisible();

    const drawer = await page.getByTestId(TEST_IDS.playerDetailDrawer).innerText();
    expect(drawer).toMatch(/Net worth/i);
    expect(drawer).toMatch(/Cash/i);
    expect(drawer).toMatch(/Owned/i);
  });

  /**
   * The control that opens a player's holdings was an empty, entirely unstyled
   * button - it rendered as a tiny default browser pill that read as a
   * rendering artefact. "Looks like a control" is testable: it has to be
   * visible, painted, and big enough to hit.
   */
  test('makes the holdings control look and behave like a control', async ({ page }) => {
    await startGame(page);

    // No expand step: the HUD is a grid, every card is fully drawn, and its
    // own button is reachable from the first frame. The chevron goes with the
    // fan - on a ~115px card the room it reserved was a third of the card.
    const open = page.getByRole('button', { name: /View .* holdings/ }).first();

    // The whole card is the target, so the tap clears the floor on both axes.
    const card = await boxOf(page, '.player-card');
    const box = await open.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    // It covers the card rather than sitting somewhere on it. `inset: 0` is
    // measured against the padding box, so the card's 1px frame and its 5px
    // token-coloured left edge are outside it by design.
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(card.right - card.left - 8);

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
  /**
   * The dice sit BETWEEN the two columns of cards, not welded to them.
   *
   * This is the third time one bug has produced a broken layout here, and the
   * first time anything has tested for it. `.player-stack.is-collapsed` sets
   * `gap: 0` at 0,2,0; the phone tier set `column-gap` on `.player-stack` at
   * 0,1,0 and lost, so the computed gap really was `0px` and a 42px die had a
   * card hard against each of its faces. The same specificity had already
   * eaten the fan's inset and the sliver rules, silently, both times.
   *
   * Measured as clearance on both sides rather than as a computed `gap`,
   * because what matters is the pixels between the two boxes - which is what
   * a `gap` on the wrong selector fails to produce while still reading back
   * as whatever value you wrote somewhere else.
   */
  test('leaves the dice room on both sides of the middle column', async ({ page }) => {
    await startGame(page, { players: 4 });

    const clearance = await page.evaluate(() => {
      const dice = document.querySelector('.dice-pair.is-hud')?.getBoundingClientRect();
      if (!dice) return null;
      const cards = Array.from(document.querySelectorAll('.player-card')).map((card) =>
        card.getBoundingClientRect()
      );
      const left = cards.filter((card) => card.right <= dice.left + 1);
      const right = cards.filter((card) => card.left >= dice.right - 1);
      return {
        cards: cards.length,
        left: Math.min(...left.map((card) => dice.left - card.right)),
        right: Math.min(...right.map((card) => card.left - dice.right)),
      };
    });

    // Vacuity guard: cards on both sides of the dice, or there is no gap to
    // measure and this passes by having found nothing.
    expect(clearance?.cards).toBe(4);
    expect(clearance?.left).toBeGreaterThanOrEqual(8);
    expect(clearance?.right).toBeGreaterThanOrEqual(8);
  });

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
    //
    // The player cards are a two-column grid now, so it is the GRID that has
    // to line up with the board; a single card is half of it by design.
    for (const selector of ['.player-stack', '.game-side-footer']) {
      const box = await boxOf(page, selector);
      expect(box.left, `${selector} left edge`).toBe(board.left);
      expect(box.right, `${selector} right edge`).toBe(board.right);
    }

    // And the outermost cards sit flush inside it, which is what proves the
    // `minmax(0, 1fr) auto minmax(0, 1fr)` template is not leaving a gutter.
    const columns = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.player-card')).map((card) =>
        card.getBoundingClientRect()
      );
      return {
        leftmost: Math.min(...cards.map((box) => box.left)),
        rightmost: Math.max(...cards.map((box) => box.right)),
      };
    });
    expect(Math.abs(columns.leftmost - board.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(columns.rightmost - board.right)).toBeLessThanOrEqual(1);
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
  /**
   * The narrowest board in the app, playing the longest names in it.
   *
   * At 320x568 the height cap gives a **281px** board - a street square 22.6px
   * wide and 38.5px deep - and that is where the name-and-price budget is
   * genuinely tight. Two real defects only showed here: `.space-name` kept an
   * `align-self: center` from when it was a direct child of `.space-label`,
   * which shrink-wrapped every line instead of giving it the cell's full run;
   * and the colour ribbon was a 7px literal rather than a fraction of the
   * board. "The Angel Islington" clipped on both counts.
   *
   * The London board is the fixture because India's longest STREET is
   * "Bhubaneshwar", which has always fitted - this spec would pass on the
   * default edition while proving nothing, the same trap overlays.spec.ts
   * documents for the deed card.
   */
  test('fits the longest names on the smallest board', async ({ page }) => {
    await startGame(page, { edition: 'Monopoly Classic (London)' });

    const measured = await page.evaluate(() => {
      const clipped: string[] = [];
      let read = 0;

      document.querySelectorAll('.board-space').forEach((cell) => {
        const cellBox = cell.getBoundingClientRect();
        cell
          .querySelectorAll('.space-name, .space-name-short, .space-price')
          .forEach((element) => {
            const style = getComputedStyle(element);
            if (style.display === 'none' || style.clipPath !== 'none') return;
            if (element.clientWidth <= 1) return;
            read += 1;

            const box = element.getBoundingClientRect();
            const overflowsItself =
              element.scrollWidth > element.clientWidth + 1 ||
              element.scrollHeight > element.clientHeight + 1;
            const escapesItsCell =
              box.left < cellBox.left - 0.5 ||
              box.right > cellBox.right + 0.5 ||
              box.top < cellBox.top - 0.5 ||
              box.bottom > cellBox.bottom + 0.5;

            if (overflowsItself || escapesItsCell) {
              clipped.push(String(element.textContent));
            }
          });
      });

      return {
        clipped,
        read,
        board: document.querySelector('.board-card')?.getBoundingClientRect().width ?? 0,
      };
    });

    // Vacuity guards: the smallest board really is small, and the sweep really
    // did read the text.
    expect(measured.board).toBeLessThan(300);
    expect(measured.read).toBeGreaterThanOrEqual(60);

    // "The Angel Islington" is the square that broke: three words whose
    // longest alone exceeds the line, beside a price.
    await expect(
      page.getByRole('button', { name: 'View details for The Angel Islington' })
    ).toBeVisible();
    expect(measured.clipped).toEqual([]);
  });

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
   * Everything on the board is sized by the BOARD, not by the window, and this
   * is the case that forces the distinction.
   *
   * Landscape sizes the board by viewport HEIGHT, so this window is 812px wide
   * with a ~320px board - every bit as small as the portrait one. A
   * viewport-width rule reported "not a phone" and left 6.72px names on it.
   * The rule under test is now the short-name swap rather than hiding the
   * name, but the trap it guards is identical.
   */
  test('sizes the type by the board, not by the window', async ({ page }) => {
    await startGame(page);

    const measured = await page.evaluate(() => {
      const board =
        document.querySelector('.board-card')?.getBoundingClientRect().width ?? 0;
      const name = document.querySelector('.space-label .space-name');
      return {
        board,
        fontSize: name ? Number.parseFloat(getComputedStyle(name).fontSize) : 0,
        shortsShown: Array.from(document.querySelectorAll('.space-name-short')).filter(
          (element) => getComputedStyle(element).display !== 'none'
        ).length,
      };
    });

    // The window is far wider than any phone breakpoint, and the board is not.
    expect(page.viewportSize()?.width).toBeGreaterThan(720);
    expect(measured.board).toBeLessThan(520);

    // The swap is on, in a window three breakpoints too wide for it to be. No
    // media query could reach this state.
    expect(measured.shortsShown).toBe(6);

    // And the type is at its floor, as it is on a portrait phone with the same
    // board - not the ~8px a window this wide would have produced from `vw`.
    expect(measured.fontSize).toBeLessThanOrEqual(6);
    expect(measured.fontSize).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// The other side of that threshold
// ---------------------------------------------------------------------------
test.describe('a desktop board', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  // The container query has to be a threshold, not a one-way trip: a board with
  // the room for its full names must show those rather than the short ones.
  test('sets the full names on a board with room for them', async ({ page }) => {
    await startGame(page);

    const board = await page.evaluate(
      () => document.querySelector('.board-card')?.getBoundingClientRect().width ?? 0
    );
    expect(board).toBeGreaterThan(520);

    await expect(page.locator('.space-label .space-name').first()).toBeVisible();

    // The six long squares are back to their own names, and the short ones are
    // the hidden half of the pair.
    const swap = await page.evaluate(() => ({
      shortsShown: Array.from(document.querySelectorAll('.space-name-short')).filter(
        (element) => getComputedStyle(element).display !== 'none'
      ).length,
      longsShown: Array.from(document.querySelectorAll('.space-name.has-short')).filter(
        (element) => getComputedStyle(element).display !== 'none'
      ).length,
    }));
    expect(swap.shortsShown).toBe(0);
    expect(swap.longsShown).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Size, on the frame most of the players are actually holding
// ---------------------------------------------------------------------------
//
// 360x640 rather than VIEWPORTS.phone, and the difference is the whole point:
// 360 is what almost every Android reports, and 640 is short enough that the
// decision modal has to earn its height. A measurement pass over this frame is
// what found the five controls below the tap floor and a buy decision 632px
// tall inside a 640px window.
test.describe('an Android phone', () => {
  test.use({ viewport: VIEWPORTS.android });

  /**
   * Every control a thumb has to hit, on every screen, against `$control-tap`.
   *
   * Two exclusions, and neither is a waiver:
   *
   * - **The board's forty cells.** A square on a 336px board is 27px wide and
   *   cannot be 44 without ceasing to be a board. `SpaceDetailCard` is how you
   *   read one; the cell is a shortcut to it.
   * - **A link inside a sentence.** WCAG 2.5.8 exempts inline text links for
   *   the same reason: the target is the sentence's line box, and padding one
   *   out to 44px would break the paragraph it sits in.
   *
   * A native checkbox is deliberately 20px and NOT excluded here - it passes
   * because the rule measures the `<label>` that wraps it, which is the actual
   * target. If `.checkbox-field` ever stops being a label, this fails, which is
   * exactly when it should.
   */
  const undersizedControls = (page: Page) =>
    page.evaluate((floor) => {
      const inlineLink = (el: Element) =>
        el.tagName === 'A' && el.closest('p, li, dd') !== null;

      return Array.from(document.querySelectorAll('button, a, select, input'))
        .filter((el) => {
          const box = el as HTMLElement;
          if (!box.offsetWidth || !box.offsetHeight) return false;
          if (el.closest('.board-card')) return false;
          if (inlineLink(el)) return false;
          // The tappable thing is the label, where there is one.
          const target = (el.closest('label') ?? el) as HTMLElement;
          return target.offsetWidth < floor || target.offsetHeight < floor;
        })
        .map((el) => {
          const target = (el.closest('label') ?? el) as HTMLElement;
          const name = el.textContent?.trim().slice(0, 24) || el.tagName;
          return `${name} (${target.offsetWidth}x${target.offsetHeight})`;
        });
    }, 44);

  for (const route of ['#/', '#/new', '#/host', '#/join', '#/rules']) {
    test(`meets the tap floor on ${route}`, async ({ page }) => {
      await page.goto(`/${route}`);
      await expect(page.locator('.app-header')).toBeVisible();

      expect(await undersizedControls(page)).toEqual([]);
    });
  }

  test('meets the tap floor on the game screen', async ({ page }) => {
    await startGame(page);

    expect(await undersizedControls(page)).toEqual([]);
  });

  /**
   * Plays until a STREET is up for sale, not merely any buy decision.
   *
   * The distinction is the whole test: a railway carries four rent rows and a
   * street carries seven plus a building-cost footer, which is about 60px more
   * card. A check that accepted the first buy decision it met would pass on a
   * railway and prove nothing about the case that actually overflowed.
   */
  const streetIsOnOffer = (page: Page) =>
    page
      .locator('.buy-decision .rent-schedule > div')
      .count()
      .then((rows) => rows >= 6);

  const playToStreetPurchase = async (page: Page): Promise<boolean> => {
    for (let step = 0; step < 80; step += 1) {
      if (await streetIsOnOffer(page)) return true;

      // `declineBuys: false` so THIS decides rather than the helper: a railway
      // is declined and play goes on, a street is what we came for. Letting
      // the helper decline would answer the street before it was measured.
      const action = await advanceGame(page, { declineBuys: false });
      if (action === 'buy-available') {
        if (await streetIsOnOffer(page)) return true;
        await page.getByTestId(TEST_IDS.declineButton).click();
        continue;
      }
      if (action === 'none') return false;
    }
    return false;
  };

  /**
   * 100px for a name and three numbers, in the scarcest column in the app -
   * and then half the width of that, once the cards became two columns with
   * the dice between them.
   *
   * At ~110px wide there is room for a name and one figure, so the card is a
   * name and its cash. Everything else it used to carry is in the holdings
   * drawer that the whole card opens, which the portrait suite asserts
   * directly - the facts moved, they did not go.
   */
  test('shows a player in a card a name and a figure tall', async ({ page }) => {
    await startGame(page);

    const card = page.locator('.player-card').first();
    const height = await card.evaluate((el: HTMLElement) => el.offsetHeight);
    expect(height).toBeLessThan(70);

    // The two facts that survive, and the currency they are counted in.
    const text = await card.innerText();
    expect(text).toMatch(/₹\d/);
    expect(text.split('\n').filter(Boolean).length).toBeLessThanOrEqual(2);
  });

  /**
   * The name is arbitrary text the player typed, in a card whose whole job is
   * to be one predictable size. `min-width: 0` alone let the flex item shrink
   * and the text still wrapped, taking the card with it.
   */
  test('keeps its size whatever a player calls themselves', async ({ page }) => {
    await startGame(page);

    const card = page.locator('.player-card').first();
    const before = await card.evaluate((el: HTMLElement) => el.offsetHeight);

    await card.locator('.player-card-name').evaluate((el) => {
      el.textContent = 'Bartholomew Fitzgerald-Montgomery the Third';
    });

    const after = await card.evaluate((el: HTMLElement) => el.offsetHeight);
    expect(after).toBe(before);
  });

  /**
   * The buy decision is the tallest thing the game ever puts on screen.
   *
   * It measured 632px inside a 640px window even for a RAILWAY, so the modal
   * scrolled internally and `Buy` - the whole reason the modal is up - sat
   * below the fold. Nothing about that was visible from a desktop, and no unit
   * test could see it, because jsdom does no layout.
   */
  test('fits a street purchase without scrolling inside itself', async ({ page }) => {
    await startGame(page);
    test.skip(!(await playToStreetPurchase(page)), 'No street came up for sale.');

    const modal = await page.evaluate(() => {
      const el = document.querySelector('.decision-modal') as HTMLElement | null;
      return el ? { client: el.clientHeight, scroll: el.scrollHeight } : null;
    });

    expect(modal).not.toBeNull();
    expect(modal?.scroll).toBeLessThanOrEqual(modal?.client ?? 0);
  });

  // The primary action of the tallest decision, reachable without a scroll.
  /**
   * The title deed, at about half the board - and still whole.
   *
   * It measured 300x360 on a 360px phone: taller than the 336px BOARD it
   * covers, with 183px of that being seven rent rows at 26px each, of which
   * 8px a row was padding. Nothing was pinning its size on a phone at all -
   * below $breakpoint-mobile it is `width: 100%; height: auto`, so it was
   * simply however tall its contents came out.
   *
   * Both halves are asserted on purpose. Small is only correct if nothing was
   * dropped to get there: a card that fits by losing the rent schedule has
   * failed at the one job it has.
   */
  test('shows the whole title deed in about half the board', async ({ page }) => {
    await startGame(page);

    await page.getByRole('button', { name: /View details for Bhopal/ }).click();
    await expect(page.getByTestId(TEST_IDS.spaceDetailCard)).toBeVisible();

    const measured = await page.evaluate(() => {
      const deed = document.querySelector('.deed-card') as HTMLElement | null;
      const board = document.querySelector('.board-card');
      if (!deed || !board) return null;
      const d = deed.getBoundingClientRect();
      const b = board.getBoundingClientRect();
      const close = document
        .querySelector('.space-detail-close')
        ?.getBoundingClientRect();
      const stats = deed.querySelector('.deed-primary-stats')?.getBoundingClientRect();
      return {
        share: (d.width * d.height) / (b.width * b.height),
        rentRows: deed.querySelectorAll('.rent-schedule > div').length,
        text: deed.textContent ?? '',
        hasFooter: deed.querySelector('.deed-footer') !== null,
        // `overflow: hidden` on the card means anything too tall is cut
        // silently rather than scrolled to.
        clipped: deed.scrollHeight > deed.clientHeight + 1,
        // The close button is 44px and absolutely placed; with the eyebrow
        // gone it landed on top of "Mortgage value".
        buttonOverlapsStats: Boolean(
          close && stats && close.bottom > stats.top && close.left < stats.right
        ),
      };
    });

    // Half the board, near enough - measured 59% here and 54% on a taller
    // phone, where the board itself is bigger.
    expect(measured?.share).toBeLessThanOrEqual(0.6);
    expect(measured?.clipped).toBe(false);
    expect(measured?.buttonOverlapsStats).toBe(false);

    // And it still says everything a player opens it for.
    expect(measured?.rentRows).toBe(7);
    expect(measured?.hasFooter).toBe(true);
    expect(measured?.text).toMatch(/Price/i);
    expect(measured?.text).toMatch(/Mortgage value/i);
    expect(measured?.text).toMatch(/With hotel/i);
  });

  /**
   * The deed is one object, at one size, wherever a phone shows it.
   *
   * overlays.spec.ts asserts exactly this on a desktop - "renders the site
   * card at one fixed size in the drawer and the modal" - and nothing said it
   * on a phone, where the card has no fixed size at all. It drifted: below
   * $breakpoint-mobile `.deed-card` is `width: 100%`, which is right where a
   * WRAPPER sets the width (the holdings drawer, the trade stack) but resolves
   * against whatever the parent happens to be everywhere else. In the
   * title-deed modal that parent is `max-content` and gave ~246px; in the buy
   * decision it is a `1fr` grid track and gave 302. Same card, two widths, in
   * the two places a player sees it against the board.
   */
  test('shows the deed at one width, in the modal and in a decision', async ({
    page,
  }) => {
    await startGame(page);

    // The title-deed modal, opened from the board.
    await page.getByRole('button', { name: /View details for Bhopal/ }).click();
    await expect(page.getByTestId(TEST_IDS.spaceDetailCard)).toBeVisible();
    const fromBoard = await page
      .locator('.deed-card')
      .evaluate((el) => el.getBoundingClientRect().width);
    await page.getByRole('button', { name: 'Close space details' }).click();

    // The same square's deed, inside a buy decision.
    for (let step = 0; step < 80; step += 1) {
      if (
        await page
          .locator('.buy-decision')
          .isVisible()
          .catch(() => false)
      )
        break;
      if ((await advanceGame(page, { declineBuys: false })) === 'none') break;
    }
    await expect(page.locator('.buy-decision')).toBeVisible();
    const inDecision = await page
      .locator('.buy-decision .deed-card')
      .evaluate((el) => el.getBoundingClientRect().width);

    // Vacuity guard: a card that measured zero in both places would pass.
    expect(fromBoard).toBeGreaterThan(100);

    // The sharp one, and the exact shape of the bug: the deed is sized by its
    // CONTENT, not by the column it was dropped into.
    const column = await page
      .locator('.buy-decision')
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(inDecision).toBeLessThan(column - 8);

    // And the two are the same object. Not to the pixel: these are two
    // different squares - the second is whatever the dice found - and
    // max-content means a longer name or a wider rent label legitimately
    // measures a little differently. The bug was 56px; this catches it with
    // room for the content to vary.
    expect(Math.abs(fromBoard - inDecision)).toBeLessThanOrEqual(24);
  });

  test('keeps the buy button on screen at the tap floor', async ({ page }) => {
    await startGame(page);
    test.skip(!(await playToStreetPurchase(page)), 'No street came up for sale.');

    const buy = page.locator('.buy-decision-buttons .primary-button');
    await expect(buy).toBeVisible();
    await expect(buy).toBeInViewport();

    // offsetHeight, not a bounding rect: the modal rises on a 200ms transform,
    // so a rect measured while that is still running reports 44px of layout as
    // 43.1px of paint. The claim here is about layout.
    const height = await buy.evaluate((el: HTMLElement) => el.offsetHeight);
    // The tap floor exactly, not the 52px this carried on top of it.
    expect(height).toBe(44);
  });
});

// ---------------------------------------------------------------------------
// What to do with the room a square board leaves on a tall screen
// ---------------------------------------------------------------------------
//
// The board is square and a phone is not, so on a tall screen the board is
// limited by WIDTH and the column under it has height to spare - 145px of it
// at 360x740 with two players.
//
// This used to assert the opposite: that the space was SHARED, half above the
// cards and half below. That was right when the player stack was the only
// thing between the board and the bar - all the space fell into one hole at
// the bottom, which read as something missing.
//
// It stopped being right when the action rail arrived between them. Halving
// the space then put a 72px gap between the rail and the players, which reads
// as the two being unrelated rather than as air: the board, the actions you
// can take on it and the people playing are one group. So the column packs
// upward now and the leftover collects above the sticky bar, where it is
// plainly just the bottom of the screen.
test.describe('a tall phone', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('packs the column under the board and leaves the room at the bottom', async ({
    page,
  }) => {
    await startGame(page);

    const rail = await boxOf(page, '.action-rail');
    const stack = await boxOf(page, '.player-stack-region');
    const footer = await boxOf(page, '.game-side-footer');

    const above = stack.top - rail.bottom;
    const below = footer.top - stack.bottom;

    // Vacuity guard: with two players there IS spare height here. If the board
    // ever grew to fill the column this test would be asserting nothing.
    expect(above + below).toBeGreaterThan(80);

    // The cards sit directly under the rail - one gap, not a hole.
    expect(above).toBeLessThanOrEqual(16);

    // And all of it is at the bottom, which is the half of this that changed.
    expect(below).toBeGreaterThan(above);

    // Still nothing underneath the bar: the column packs up, it does not spill.
    expect(stack.bottom).toBeLessThanOrEqual(footer.top);
  });
});

/**
 * The other end of the same rule: a column with nothing left to share.
 *
 * A SHORT frame rather than a full table, and that is the point - once the
 * player card came down from 100px to about 67, eight expanded players fitted
 * in a 740px phone with room to spare, so "a full table" stopped being a full
 * column and the test quietly stopped testing anything. Height is what makes
 * the column full; the number of players only used to.
 *
 * There is no expand step any more: the HUD is a grid with every card drawn,
 * so eight players at 320x568 overflow on their own.
 */
test.describe('a short phone', () => {
  test.use({ viewport: VIEWPORTS.phoneSmall });

  test('gives the shared space back when the column overflows', async ({ page }) => {
    await startGame(page, { players: MAX_PLAYERS });

    const state = await page.evaluate(() => {
      const side = document.querySelector('.game-side') as HTMLElement;
      const region = document.querySelector('.player-stack-region') as HTMLElement;
      const first = document.querySelector('.player-card') as HTMLElement;
      return {
        margin: getComputedStyle(region).marginTop,
        scrolls: side.scrollHeight > side.clientHeight,
        scrollTop: side.scrollTop,
        firstCardTop: first.getBoundingClientRect().top,
        columnTop: side.getBoundingClientRect().top,
      };
    });

    // Vacuity guard: the whole claim is about a column with no free space.
    expect(state.scrolls).toBe(true);
    expect(state.margin).toBe('0px');
    // Nothing pushed off the top of the scroll container. Measured at rest, so
    // an ordinary scroll position cannot be mistaken for clipping.
    expect(state.scrollTop).toBe(0);
    expect(state.firstCardTop).toBeGreaterThanOrEqual(state.columnTop - 1);
  });
});
