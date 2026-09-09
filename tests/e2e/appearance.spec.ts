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

/**
 * Open the header's settings menu and pick an appearance.
 *
 * It used to be a `<select>` inside the new-game form - which implied it was
 * saved with the game - and a second, cycling control in the game's sidebar.
 * One control in the header now, reachable from every route, which is why this
 * helper works in-game and on the booklet as well as on the front door.
 */
const chooseAppearance = async (page: Page, value: string) => {
  // Open it only if it is not already open: the panel stays up after a
  // selection, on purpose - two settings live in there - so clicking the
  // trigger a second time would close it instead.
  const panel = page.getByTestId(TEST_IDS.settingsPanel);
  if ((await panel.count()) === 0) {
    await page.getByTestId(TEST_IDS.settingsTrigger).click();
  }
  await page.getByTestId(TEST_IDS.appearanceSelect).selectOption(value);
};

test('leaves the board in its edition colours by default', async ({ page }) => {
  await startGame(page);

  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'india-edition');
});

test('repaints the whole board without changing the edition', async ({ page }) => {
  // The setup screen rather than the chooser: it has a primary button for the
  // probe below to read, and the chooser is all links.
  await page.goto('/#/new');
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

  await chooseAppearance(page, 'aesthetic');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  const after = await paletteOf(page);
  expect(after.cell).not.toBe(before.cell);
  expect(after.ribbon).not.toBe(before.ribbon);
});

/**
 * Midnight, which is the design system's own acceptance test.
 *
 * This palette was fully defined and deliberately unselectable for a long
 * time, blocked by three things docs/theming.md named: ink-tinted drop
 * shadows, dark-translucent scrims, and a die hardcoded white with near-black
 * pips. All three were literals in component partials rather than palette
 * decisions, so no amount of theming could reach them.
 *
 * They are tokens now, and shipping this took one row in APPEARANCES. That is
 * the claim being tested: if the system is real, a palette that was impossible
 * simply drops in.
 */
test('wears a dark palette, dice and all', async ({ page }) => {
  await startGame(page);
  const before = await paletteOf(page);

  await chooseAppearance(page, 'midnight');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'midnight');

  const after = await paletteOf(page);
  expect(after.shell).not.toBe(before.shell);
  expect(after.cell).not.toBe(before.cell);
  expect(after.ribbon).not.toBe(before.ribbon);
  // Not .primary-button: the game screen has none - its primary control is the
  // dice button, which is why the test above uses /#/new for that probe.

  // The three named blockers, each read directly. A die that stayed white on a
  // dark board is exactly what kept this palette on the shelf.
  const blockers = await page.evaluate(() => {
    const shell = document.querySelector('.app-shell');
    if (!shell) return null;
    const style = getComputedStyle(shell);
    return {
      die: style.getPropertyValue('--die-face').trim(),
      ink: style.getPropertyValue('--shadow-ink').trim(),
      scrim: style.getPropertyValue('--scrim').trim(),
    };
  });
  expect(blockers?.die).toContain('#2b323b');
  expect(blockers?.ink).toBe('rgba(0, 0, 0, 0.55)');
  expect(blockers?.scrim).toBe('rgba(0, 0, 0, 0.66)');
});

test('keeps the edition it is playing while wearing another palette', async ({
  page,
}) => {
  await startGame(page);
  await chooseAppearance(page, 'aesthetic');

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
  await chooseAppearance(page, 'aesthetic');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  await page.reload();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  await page.goto('/');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  // And the control agrees with the board - the select is in the header's
  // menu, so it has to be opened to be read.
  await page.getByTestId(TEST_IDS.settingsTrigger).click();
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

test('goes back to the edition colours', async ({ page }) => {
  await startGame(page);

  await chooseAppearance(page, 'aesthetic');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'aesthetic');

  await chooseAppearance(page, 'edition');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'india-edition');
});

test.describe('on a phone', () => {
  test.use({ viewport: VIEWPORTS.phone });

  /**
   * The settings live in the header on a phone too. They used to be a control
   * in the game's sidebar, which is a scroll region whose last child is a
   * sticky bar - so the control sat behind that bar until you scrolled.
   */
  test('opens the settings from the header without leaving the viewport', async ({
    page,
  }) => {
    await startGame(page);

    const trigger = page.getByTestId(TEST_IDS.settingsTrigger);
    await expect(trigger).toBeVisible();

    const box = await trigger.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await trigger.click();
    await expect(page.getByTestId(TEST_IDS.settingsPanel)).toBeVisible();

    // A 260px panel anchored to the right edge of a 375px screen is the
    // overflow risk, so this is the assertion that matters.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const panel = await page.getByTestId(TEST_IDS.settingsPanel).boundingBox();
    expect(panel?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThanOrEqual(375);
  });

  test('closes the settings on Escape', async ({ page }) => {
    await startGame(page);

    await page.getByTestId(TEST_IDS.settingsTrigger).click();
    await expect(page.getByTestId(TEST_IDS.settingsPanel)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId(TEST_IDS.settingsPanel)).toHaveCount(0);
  });
});
