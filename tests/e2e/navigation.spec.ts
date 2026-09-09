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

// An unmatched hash used to render a blank page.
test('says so on a route that does not exist', async ({ page }) => {
  await page.goto('/#/no-such-screen');

  await expect(page.getByTestId(TEST_IDS.notFoundPanel)).toBeVisible();
  await page.getByRole('link', { name: /Back to the start/i }).click();
  await expect(page.getByTestId(TEST_IDS.chooserPlayLocal)).toBeVisible();
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
