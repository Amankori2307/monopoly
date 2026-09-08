import { expect, test, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame, VIEWPORTS } from './helpers';

/**
 * Appearances: colour without an edition.
 *
 * `data-theme` used to come straight off `GameState.themeId`, so the only way
 * to recolour the board was to play a different board. An appearance is a
 * per-device preference - the same standing as the sound switch - that
 * overrides the palette and leaves the game alone.
 *
 * These assert computed colour, which is the only level that can see a palette
 * at all: jsdom resolves no custom properties, so a unit test can prove the
 * attribute is set and nothing more.
 */

test.use({ viewport: VIEWPORTS.desktop });

/** Colours that between them cover the board, the chrome and the controls. */
const paletteOf = (page: Page) =>
  page.evaluate(() => {
    const bg = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).backgroundColor : null;
    };
    return {
      shell: bg('.app-shell'),
      cell: bg('.board-space:not(.active-space)'),
      ribbon: bg('.board-logo-ribbon'),
      primaryButton: bg('.primary-button'),
    };
  });

const chooseAppearance = async (page: Page, value: string) => {
  await page.getByTestId(TEST_IDS.appearanceSelect).selectOption(value);
};

test('leaves the board in its edition colours by default', async ({ page }) => {
  await startGame(page);

  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'india-edition');
});

test('repaints the whole board without changing the edition', async ({ page }) => {
  await page.goto('/');
  const before = await paletteOf(page);

  await chooseAppearance(page, 'aesthetic');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  const after = await paletteOf(page);

  // The acceptance gate, and the same one board.spec.ts uses for the board's
  // own tokens: flip the palette and every colour must move. Anything still
  // hardcoded simply will not.
  expect(after.shell).not.toBe(before.shell);
  expect(after.primaryButton).not.toBe(before.primaryButton);
});

test('recolours the board itself, not just the chrome', async ({ page }) => {
  await startGame(page);
  const before = await paletteOf(page);

  await page.getByTestId(TEST_IDS.appearanceToggle).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  const after = await paletteOf(page);
  expect(after.cell).not.toBe(before.cell);
  expect(after.ribbon).not.toBe(before.ribbon);
});

test('keeps the edition it is playing while wearing another palette', async ({
  page,
}) => {
  await startGame(page);
  await page.getByTestId(TEST_IDS.appearanceToggle).click();

  // The squares still carry the names they were dealt: an appearance is not an
  // edition, and this is the whole distinction.
  await expect(
    page.getByRole('button', { name: 'View details for Guwahati', exact: true })
  ).toBeVisible();
});

/**
 * A preference, not game state - so it outlives the game it was chosen in.
 * `page.goto` to a URL differing only in its hash does not reload, so this
 * reloads explicitly to make the app re-read localStorage.
 */
test('remembers the appearance across a reload and a new game', async ({ page }) => {
  await startGame(page);
  await page.getByTestId(TEST_IDS.appearanceToggle).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  await page.reload();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  await page.goto('/');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');
  await expect(page.getByTestId(TEST_IDS.appearanceSelect)).toHaveValue('aesthetic');
});

// The booklet had no data-theme at all, so a chosen appearance stopped at its
// door and it always rendered in the default palette.
test('carries the appearance into the rules booklet', async ({ page }) => {
  await page.goto('/');
  await chooseAppearance(page, 'aesthetic');

  await page.goto('/#/rules');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');
});

test('cycles back to the edition colours', async ({ page }) => {
  await startGame(page);

  await page.getByTestId(TEST_IDS.appearanceToggle).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  await page.getByTestId(TEST_IDS.appearanceToggle).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'india-edition');
});

test.describe('on a phone', () => {
  test.use({ viewport: VIEWPORTS.phone });

  /**
   * The control drops its name below the phone breakpoint. That is not
   * cosmetic: with the name, the sidebar's link row wrapped to a second line,
   * and the second line of a scroll region whose last child is a sticky bar
   * sits exactly behind that bar - so the control was invisible until you
   * scrolled, which is how it was found.
   */
  test('keeps the appearance control clear of the action bar', async ({ page }) => {
    await startGame(page);

    const toggle = page.getByTestId(TEST_IDS.appearanceToggle);
    await expect(toggle).toBeVisible();

    const [control, footer] = await Promise.all([
      toggle.boundingBox(),
      page.locator('.game-side-footer').boundingBox(),
    ]);
    if (!control || !footer) {
      throw new Error('The appearance control or the action bar has no layout box');
    }

    expect(control.y + control.height).toBeLessThanOrEqual(footer.y + 1);
    // Icon-only, so it has to earn its touch target rather than inherit it.
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.height).toBeGreaterThanOrEqual(44);
  });

  test('still names the appearance for a screen reader', async ({ page }) => {
    await startGame(page);

    await expect(
      page.getByRole('button', {
        name: /^Appearance: .+\. Change how the board looks\.$/,
      })
    ).toBeVisible();
  });
});
