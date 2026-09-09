import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { advanceGame, openChooser, startGame, VIEWPORTS } from './helpers';

/**
 * The front door, and the header that replaced four scattered controls.
 *
 * `/` used to carry the masthead, a ruleset table, the whole 2-to-8-player
 * setup form, an appearance picker, the saved-games list AND the online button,
 * while the game screen kept Home, Rules, a sound switch and an appearance
 * cycler in its own sidebar - taking room from the game on the smallest
 * screens. One question at the door, and the settings in the header.
 */

test.use({ viewport: VIEWPORTS.desktop });

test('asks how you want to play, and nothing else', async ({ page }) => {
  await openChooser(page);

  await expect(page.getByTestId(TEST_IDS.chooserPlayLocal)).toBeVisible();
  // The form is a screen away, not on the front door.
  await expect(page.getByRole('button', { name: 'Create game' })).toHaveCount(0);
  await expect(page.getByTestId(TEST_IDS.setupForm)).toHaveCount(0);
});

test('offers no way back into a game before there is one', async ({ page }) => {
  await openChooser(page);

  await expect(page.getByTestId(TEST_IDS.chooserContinue)).toHaveCount(0);
});

/**
 * Resuming is the commonest repeat visit, so it is a row on the front door
 * rather than a screen deeper in.
 */
test('offers the last game back once one exists', async ({ page }) => {
  await startGame(page);
  await openChooser(page);

  const resume = page.getByTestId(TEST_IDS.chooserContinue);
  await expect(resume).toBeVisible();
  // A local game says so, because an online one behaves differently.
  await expect(resume).toContainText('Local');

  await resume.click();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
});

test('reaches the setup screen from the front door', async ({ page }) => {
  await openChooser(page);

  await page.getByTestId(TEST_IDS.chooserPlayLocal).click();

  await expect(page).toHaveURL(/#\/new/);
  await expect(page.getByRole('button', { name: 'Create game' })).toBeVisible();
  await expect(
    page.getByTestId(TEST_IDS.recentGamesList).or(page.locator('.empty-state'))
  ).toBeVisible();
});

test('carries the header onto every screen, the game included', async ({ page }) => {
  for (const route of ['/', '/#/new', '/#/rules']) {
    await page.goto(route);
    await expect(page.getByTestId(TEST_IDS.appHeader)).toBeVisible();
  }

  await startGame(page);
  await expect(page.getByTestId(TEST_IDS.appHeader)).toBeVisible();
});

/**
 * The four controls that used to live in the game's sidebar are the header's
 * job now. The sidebar keeps only what is about the game.
 */
test('leaves no navigation in the game sidebar', async ({ page }) => {
  await startGame(page);

  const sidebar = page.getByTestId(TEST_IDS.gameSidebar);
  await expect(sidebar.getByRole('link', { name: 'Home' })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'Rules' })).toHaveCount(0);
  await expect(sidebar.getByTestId(TEST_IDS.soundToggle)).toHaveCount(0);
});

test('keeps the sound switch reachable mid-game, from the header', async ({ page }) => {
  await startGame(page);

  await page.getByTestId(TEST_IDS.settingsTrigger).click();
  const toggle = page.getByTestId(TEST_IDS.soundToggle);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // A preference, so it outlives the page.
  await page.reload();
  await page.getByTestId(TEST_IDS.settingsTrigger).click();
  await expect(page.getByTestId(TEST_IDS.soundToggle)).toHaveAttribute(
    'aria-pressed',
    'false'
  );
});

/**
 * The decision backdrop is a fixed sheet over the whole viewport, so with the
 * header unpositioned the app's only navigation went dead the moment a card or
 * a buy decision came up - no rules, no mute, no way out until it was answered.
 * Found by a sound test failing after a reload, not by looking.
 */
test('keeps the header usable while a decision modal is up', async ({ page }) => {
  await startGame(page);

  // Play on until something blocks - a card or a buy decision.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (await page.getByTestId(TEST_IDS.decisionModal).isVisible()) {
      break;
    }
    await advanceGame(page, { acknowledgeCards: false, declineBuys: false });
  }
  await expect(page.getByTestId(TEST_IDS.decisionModal)).toBeVisible();

  // The settings still open, over the backdrop.
  await page.getByTestId(TEST_IDS.settingsTrigger).click();
  await expect(page.getByTestId(TEST_IDS.settingsPanel)).toBeVisible();
  await page.keyboard.press('Escape');

  // And the nav still goes somewhere.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Rules' })
    .click();
  await expect(page).toHaveURL(/\/rules/);
});

/**
 * Every page needs air under the header.
 *
 * `.rules-shell` put its 28-72px of breathing room as `padding-block` on the
 * SHELL, and the header negates the shell's padding to sit flush with the
 * window - so all of it landed ABOVE the header and the booklet's h1 sat
 * against the header's border. Per route, because that is how it was missed.
 */
for (const route of ['/', '/#/new', '/#/rules', '/#/host', '/#/join']) {
  test(`leaves air between the header and the content of ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByTestId(TEST_IDS.appHeader)).toBeVisible();

    const gap = await page.evaluate(() => {
      const header = document.querySelector('.app-header') as HTMLElement;
      // The first thing the page itself draws, whatever wrapper it uses.
      const content = document.querySelector(
        '.app-shell > :not(.app-header)'
      ) as HTMLElement;
      const first = (content.querySelector('h1, h2, section, .panel') ??
        content) as HTMLElement;
      return first.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
    });

    expect(gap).toBeGreaterThanOrEqual(12);
  });
}

// The header must be flush with the window, not floating inside the shell's
// padding - it was 28px down the page at 1280px.
test('sits the header flush against the top of the window', async ({ page }) => {
  await page.goto('/');

  const box = await page.getByTestId(TEST_IDS.appHeader).boundingBox();
  expect(box?.y ?? -1).toBe(0);
  expect(box?.x ?? -1).toBe(0);
});

// An unmatched hash used to render a blank page.
test('says so on a route that does not exist', async ({ page }) => {
  await page.goto('/#/no-such-screen');

  await expect(page.getByTestId(TEST_IDS.notFoundPanel)).toBeVisible();
  await page.getByRole('link', { name: /Back to the start/i }).click();
  await expect(page.getByTestId(TEST_IDS.chooserPlayLocal)).toBeVisible();
});

/**
 * Every control the keyboard can reach draws the same ring.
 *
 * `components/_buttons.scss` had no `:focus-visible` at all, so the app's three
 * most-used controls - primary, secondary and danger - fell back to whatever
 * the browser drew, which over a saturated background with `border: 0` is close
 * to invisible. Eleven other controls each hand-rolled one instead, at two
 * widths and five offsets.
 *
 * This has to be e2e: jsdom resolves no custom properties, so `--focus-ring`
 * is empty there and the assertion would pass on nothing.
 */
test('draws one focus ring on every control the keyboard reaches', async ({ page }) => {
  await openChooser(page);

  const ringOf = async (selector: string) => {
    await page.locator(selector).first().focus();
    return page
      .locator(selector)
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          style: style.outlineStyle,
          width: style.outlineWidth,
          colour: style.outlineColor,
        };
      });
  };

  const expected = await ringOf('.settings-trigger');
  expect(expected.style).not.toBe('none');
  expect(expected.width).toBe('3px');

  // The chooser's tiles are links, and the header carries the icon button; the
  // point is that they agree rather than that any one of them is right.
  for (const selector of ['.play-choice', '.app-nav-link']) {
    expect(await ringOf(selector)).toEqual(expected);
  }

  // And a real <button>, on a screen that has one.
  await page.goto('/#/new');
  const primary = await ringOf('.primary-button');
  expect(primary.style).not.toBe('none');
  expect(primary.width).toBe(expected.width);
  expect(primary.colour).toBe(expected.colour);
});

test.describe('on a phone', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('fits the front door with no sideways scroll', async ({ page }) => {
    await openChooser(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
