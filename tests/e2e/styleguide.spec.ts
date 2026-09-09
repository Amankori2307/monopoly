import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { VIEWPORTS } from './helpers';

/**
 * The page that shows the design system, and keeps showing all of it.
 *
 * It has to be e2e for the same reason `appearance.spec.ts` does: jsdom
 * resolves no custom properties, so every swatch would be empty there and the
 * assertions would pass on nothing.
 */

test.use({ viewport: VIEWPORTS.desktop });

test('renders every scale', async ({ page }) => {
  await page.goto('/#/style');

  await expect(page.getByTestId(TEST_IDS.stylePage)).toBeVisible();

  // One specimen per type role, one bar per rung of the grid. The counts come
  // from the SCSS via styleGuide.guard.test.ts, so this only has to prove the
  // page renders them rather than restate the numbers.
  expect(await page.locator('.style-specimen').count()).toBeGreaterThan(10);
  expect(await page.locator('.style-bar').count()).toBeGreaterThan(10);
  expect(await page.locator('.style-tile').count()).toBeGreaterThan(4);

  // The bars are the grid, so each must be a multiple of four and strictly
  // wider than the one before it. A ladder that is not monotonic is not one.
  const widths = await page
    .locator('.style-bar')
    .evaluateAll((bars) =>
      bars.map((bar) => Math.round(bar.getBoundingClientRect().width))
    );
  expect(widths.every((width) => width % 4 === 0)).toBe(true);
  expect(widths).toEqual([...widths].sort((a, b) => a - b));
  expect(new Set(widths).size).toBe(widths.length);
});

test('reads its swatches from the palette, not from a list', async ({ page }) => {
  await page.goto('/#/style');

  const swatches = page.getByTestId(TEST_IDS.styleSwatches).locator('li');
  // The page names no token in its source - it reads them off the DOM, so the
  // contract guard stays honest. That only works if they actually arrive.
  await expect.poll(() => swatches.count()).toBeGreaterThan(50);
});

test('repaints every swatch when the appearance changes', async ({ page }) => {
  await page.goto('/#/style');
  const firstSwatch = page.locator('.style-swatch').first();
  await expect(firstSwatch).toBeVisible();

  const colourOf = () =>
    firstSwatch.evaluate((element) => getComputedStyle(element).backgroundColor);
  const before = await colourOf();

  // Straight at the shell, the way appearance.spec.ts does - this asserts the
  // page follows the palette, not that the settings menu works.
  await page.evaluate(() =>
    document.querySelector('.app-shell')?.setAttribute('data-theme', 'midnight')
  );

  expect(await colourOf()).not.toBe(before);
});
