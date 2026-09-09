import { expect, test } from '@playwright/test';
import { RULES_SECTIONS } from '../../src/components/rules/rulesSections.constants';
import {
  JAIL_FINE,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../../src/domain/constants/game.constants';
import { startGame } from './helpers';

/**
 * The booklet is the player-facing half of the ruleset; the other half is
 * docs/india-edition-rules.md, kept in step by rulesSync.test.ts. This covers
 * what only a browser can: the nav resolves, and the amounts render.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/#/rules');
  await expect(page.getByRole('heading', { name: /Rules of play/i })).toBeVisible();
});

test('every nav link scrolls to a section that exists', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: /Rules sections/i });
  await expect(nav.locator('a')).toHaveCount(RULES_SECTIONS.length);

  for (const section of RULES_SECTIONS) {
    // The href is the router's own URL, not a bare `#faq` anchor - see the
    // comment in RulesPage.
    const link = nav.locator(`a[href="#/rules#${section.id}"]`);
    await expect(link, `no nav link for the ${section.label} section`).toHaveText(
      section.label
    );
    await expect(
      page.locator(`#${section.id}`),
      `nav links to #${section.id} but no such section renders`
    ).toBeAttached();
  }
});

test('a nav link stays on the rules page and scrolls to its section', async ({
  page,
}) => {
  // The nav used to be bare `#faq` anchors. Under HashRouter that is the route
  // itself, so clicking one navigated to `/faq`, matched nothing, and left a
  // blank page. Asserting the href exists - which is all this file used to do -
  // could not have caught it: only a click can.
  await page
    .getByRole('navigation', { name: /Rules sections/i })
    .getByText('FAQ')
    .click();

  await expect(page).toHaveURL(/#\/rules#faq$/);
  await expect(page.getByRole('heading', { name: /Rules of play/i })).toBeVisible();
  await expect(page.locator('#faq')).toBeInViewport();
});

test('answers the questions that come up mid-game', async ({ page }) => {
  const faq = page.locator('#faq');
  await expect(faq).toBeVisible();

  // The three answers people most often get wrong.
  await expect(faq).toContainText(/your turn ends immediately/i);
  await expect(faq).toContainText(/One per turn/i);
  await expect(faq).toContainText(/cannot auction property you own/i);

  // Every question has an answer beside it.
  const questions = await faq.locator('dt').count();
  expect(questions).toBeGreaterThan(0);
  await expect(faq.locator('dd')).toHaveCount(questions);
});

/**
 * With no game open the booklet reads generically: the amounts are bare and
 * the words are the ones true of every edition. It used to hardcode India's -
 * cities, railway stations, rupees - which is wrong for three of the four
 * boards and arbitrary for a reader who has not chosen one.
 */
test('quotes ruleset amounts from the constants, with no currency of its own', async ({
  page,
}) => {
  const booklet = page.locator('.rules-booklet');

  for (const amount of [STARTING_CASH, PASS_GO_AMOUNT, JAIL_FINE]) {
    await expect(booklet).toContainText(String(amount));
  }

  // No edition's symbol, and no leftovers from the old placeholder currency.
  await expect(booklet).not.toContainText('₹');
  await expect(booklet).not.toContainText(/\bM\d/);
  await expect(booklet).toContainText(/propert(y|ies)/i);
});

/**
 * Mid-game it follows the board you are actually looking at - which is what
 * the header's Rules link is mostly for.
 */
test('follows the edition being played', async ({ page }) => {
  await startGame(page);
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Rules' })
    .click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Rules of play/);
  await expect(page.locator('.rules-header')).toContainText(/India Edition/);

  const booklet = page.locator('.rules-booklet');
  // India's money and India's words.
  await expect(booklet).toContainText(`₹${STARTING_CASH}`);
  await expect(booklet).toContainText(/cities/i);
  await expect(booklet).toContainText(/railway station/i);
});

/**
 * The booklet used to be reachable from one link on one screen. The header
 * carries it on every route, including mid-game - where getting to the rules
 * previously meant a link buried in the game's own sidebar.
 */
test('is reachable from the header on any screen', async ({ page }) => {
  await startGame(page);

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Rules' })
    .click();

  await expect(page).toHaveURL(/\/rules/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Rules of play/);
});
