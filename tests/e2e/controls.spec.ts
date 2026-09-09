import { expect, test, type Locator, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { advanceGame, startGame, VIEWPORTS } from './helpers';

/**
 * The control surface: what a button IS, on every screen.
 *
 * These are computed-style assertions rather than screenshots because the
 * claims are about rules, not pixels - "no button casts a shadow in any state"
 * is checkable and a picture of one button is not.
 *
 * The redesign these pin down: buttons used to carry `border: 0` and, on
 * hover, a 1px lift over `$emboss-press` - a hard 5px blurless offset. That
 * offset is real elsewhere and deliberately so, on the board's colour ribbon
 * and on the die, because those are objects. On chrome it read as a toy, and
 * on touch it LATCHED: Android holds :hover after a tap, so a button you had
 * just pressed stayed raised over a slab of ink.
 */

/**
 * Every button variant, with the shortest way to put one on screen.
 *
 * `.danger-button` is the only one that needs a setup rather than a route: it
 * is Delete on a saved game's row, so a fresh profile's /new page has none.
 */
const VARIANTS: { css: string; reach: (page: Page) => Promise<unknown> }[] = [
  { css: '.primary-button', reach: (page) => page.goto('/#/new') },
  { css: '.secondary-button', reach: (page) => page.goto('/#/host') },
  { css: '.settings-trigger', reach: (page) => page.goto('/#/') },
  {
    css: '.danger-button',
    reach: async (page) => {
      await startGame(page);
      await page.goto('/#/new');
    },
  },
];

const styleOf = (locator: Locator, property: string) =>
  locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property);

test.describe('the control surface', () => {
  for (const { css, reach } of VARIANTS) {
    test(`${css} casts no shadow, at rest or under the pointer`, async ({ page }) => {
      await reach(page);
      const button = page.locator(`${css}:not(:disabled)`).first();
      await expect(button).toBeVisible();

      expect(await styleOf(button, 'box-shadow')).toBe('none');

      // The state that used to carry it. `.hover()` is a real pointer move, so
      // this is the same code path a mouse takes.
      await button.hover();
      expect(await styleOf(button, 'box-shadow')).toBe('none');
      // And no lift: the transform is gone with the shadow it was paired to.
      expect(await styleOf(button, 'transform')).toBe('none');
    });
  }

  /**
   * A field and a button in the same row used to be 48px and 44px, four pixels
   * out of line for no reason anybody had chosen - the field's height was
   * whatever `body` leading plus its padding happened to come to.
   */
  test('gives every control on a form the same height', async ({ page }) => {
    await page.goto('/#/new');
    await expect(page.locator('.primary-button').first()).toBeVisible();

    const heights = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          '.primary-button, .secondary-button, .danger-button, .text-input, .select-input'
        )
      )
        .filter((el) => (el as HTMLElement).offsetHeight > 0)
        .map((el) => (el as HTMLElement).offsetHeight)
    );

    expect(heights.length).toBeGreaterThan(4);
    expect(new Set(heights)).toEqual(new Set([44]));
  });

  /**
   * The label above a field is bold and the reset gives a control
   * `font: inherit`, so every value the player typed came out bold with it.
   */
  test('does not let a label’s weight reach the value you type', async ({ page }) => {
    await page.goto('/#/new');
    const field = page.locator('.text-input').first();
    await expect(field).toBeVisible();

    expect(await styleOf(field, 'font-weight')).toBe('400');
  });

  /**
   * `.chip-button` was 23px tall - the smallest target in the app - and no
   * sweep could see it, because reaching the auction's bid shortcuts takes a
   * live auction. Compact changes the WIDTH and the label, never the height.
   */
  test('keeps the auction’s bid shortcuts at the tap floor', async ({ page }) => {
    await startGame(page);

    for (let step = 0; step < 40; step += 1) {
      if (await page.locator('.chip-button').first().isVisible()) break;
      if ((await advanceGame(page, { declineBuys: true })) === 'none') break;
    }

    const chips = page.locator('.chip-button');
    test.skip((await chips.count()) === 0, 'No auction opened.');

    const boxes = await chips.evaluateAll((els) =>
      els.map((el) => ({
        label: el.textContent?.trim() ?? '',
        w: (el as HTMLElement).offsetWidth,
        h: (el as HTMLElement).offsetHeight,
      }))
    );

    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.h, `${box.label} height`).toBeGreaterThanOrEqual(44);
      expect(box.w, `${box.label} width`).toBeGreaterThanOrEqual(44);
    }
  });
});

/**
 * The same surface on a phone, where the shadow was most visible and where a
 * latched :hover had nothing to clear it.
 */
test.describe('the control surface on a phone', () => {
  test.use({ viewport: VIEWPORTS.android });

  test('casts no shadow on the game screen’s own buttons', async ({ page }) => {
    await startGame(page);

    const roll = page.getByTestId(TEST_IDS.rollButton);
    await expect(roll).toBeVisible();

    expect(await styleOf(roll, 'box-shadow')).toBe('none');
    expect(await styleOf(roll, 'transform')).toBe('none');
  });
});
