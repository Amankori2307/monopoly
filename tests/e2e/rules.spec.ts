import { expect, test } from '@playwright/test';
import { RULES_SECTIONS } from '../../src/components/rules/rulesSections.constants';
import {
  JAIL_FINE,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../../src/domain/constants/game.constants';

/**
 * The booklet is the player-facing half of the ruleset; the other half is
 * docs/india-edition-rules.md, kept in step by rulesSync.test.ts. This covers
 * what only a browser can: the nav resolves, and the amounts render.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/rules');
  await expect(page.getByRole('heading', { name: /Rules of play/i })).toBeVisible();
});

test('every nav link scrolls to a section that exists', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: /Rules sections/i });
  await expect(nav.locator('a')).toHaveCount(RULES_SECTIONS.length);

  for (const section of RULES_SECTIONS) {
    const link = nav.locator(`a[href="#${section.id}"]`);
    await expect(link, `no nav link for the ${section.label} section`).toHaveText(
      section.label
    );
    await expect(
      page.locator(`#${section.id}`),
      `nav links to #${section.id} but no such section renders`
    ).toBeAttached();
  }
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

test('quotes ruleset amounts in rupees, from the constants', async ({ page }) => {
  const booklet = page.locator('.rules-booklet');

  for (const amount of [STARTING_CASH, PASS_GO_AMOUNT, JAIL_FINE]) {
    await expect(booklet).toContainText(`₹${amount}`);
  }
  // No leftovers from the old placeholder currency.
  await expect(booklet).not.toContainText(/\bM\d/);
});

test('is reachable from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Read the rules/i }).click();

  await expect(page).toHaveURL(/\/rules/);
  await expect(page.locator('#faq')).toBeVisible();
});
