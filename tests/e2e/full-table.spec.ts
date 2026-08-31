import { expect, test, type Page } from '@playwright/test';
import { MAX_PLAYERS } from '../../src/domain/constants/game.constants';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * A full table is where the layout is under the most pressure: eight tokens
 * share GO on turn one, and eight player cards are taller than the sidebar.
 * Both used to break - tokens walked off the board, and the cards painted over
 * the dice and the end-turn button.
 */

/** Waits for the stack's max-height transition, which otherwise mismeasures. */
const settle = (page: Page) => page.waitForTimeout(600);

const isFullyInside = async (page: Page, childSelector: string, parentTestId: string) =>
  page.evaluate(
    ([selector, testId]) => {
      const parent = document
        .querySelector(`[data-testid="${testId}"]`)
        ?.getBoundingClientRect();
      if (!parent) {
        return null;
      }
      return Array.from(document.querySelectorAll(selector)).every((node) => {
        const box = node.getBoundingClientRect();
        return (
          box.left >= parent.left - 1 &&
          box.right <= parent.right + 1 &&
          box.top >= parent.top - 1 &&
          box.bottom <= parent.bottom + 1
        );
      });
    },
    [childSelector, parentTestId] as const
  );

test('keeps all eight tokens on the board when they share a space', async ({ page }) => {
  await startGame(page, { players: MAX_PLAYERS });

  const tokens = page.locator('.token-chip');
  await expect(tokens).toHaveCount(MAX_PLAYERS);

  // Every player starts on GO, the tightest crowd the game can produce.
  expect(await isFullyInside(page, '.token-chip', TEST_IDS.boardGrid)).toBe(true);
  // ...and inside the GO square itself, not merely somewhere on the board.
  expect(await isFullyInside(page, '.token-chip', `${TEST_IDS.boardSpace}-0`)).toBe(true);
});

test('keeps the dice and turn controls reachable with a full table', async ({ page }) => {
  await startGame(page, { players: MAX_PLAYERS });
  await settle(page);

  const inViewport = async (testId: string) =>
    page.evaluate((id) => {
      const box = document
        .querySelector(`[data-testid="${id}"]`)
        ?.getBoundingClientRect();
      return box ? box.top >= 0 && box.bottom <= window.innerHeight : null;
    }, testId);

  // Collapsed, then expanded: the expanded stack is what used to overflow.
  expect(await inViewport(TEST_IDS.rollButton)).toBe(true);

  await page.getByTestId(TEST_IDS.playerStackExpand).click();
  await settle(page);

  await expect(page.getByTestId(TEST_IDS.rollButton)).toBeVisible();
  expect(await inViewport(TEST_IDS.rollButton)).toBe(true);
  await expect(page.getByTestId(TEST_IDS.playerStackToggle)).toBeVisible();
});

test('scrolls a full stack inside its own box rather than over the column', async ({
  page,
}) => {
  await startGame(page, { players: MAX_PLAYERS });
  await page.getByTestId(TEST_IDS.playerStackExpand).click();
  await settle(page);

  const layout = await page.evaluate(() => {
    const region = document.querySelector('.player-stack-region') as HTMLElement;
    const side = document.querySelector('.game-side') as HTMLElement;
    const links = document.querySelector('.game-side-scroll') as HTMLElement;
    return {
      // The stack may claim only part of the column, leaving room for the rest.
      regionHeight: region.getBoundingClientRect().height,
      sideHeight: side.getBoundingClientRect().height,
      // Its content is taller than its box, so it scrolls instead of spilling.
      stackOverflows: (() => {
        const scroll = document.querySelector('.player-stack-scroll') as HTMLElement;
        return scroll.scrollHeight > scroll.clientHeight;
      })(),
      linksClipped: links.scrollHeight > links.clientHeight + 1,
    };
  });

  expect(layout.stackOverflows).toBe(true);
  expect(layout.regionHeight).toBeLessThan(layout.sideHeight);
  // The Home / Rules row below the stack stays readable.
  expect(layout.linksClipped).toBe(false);
});

test('plays a turn with a full table', async ({ page }) => {
  await startGame(page, { players: MAX_PLAYERS });

  await page.getByTestId(TEST_IDS.rollButton).click();

  const toast = page.locator(`[data-testid^="${TEST_IDS.toast}-"]`).first();
  await expect(toast).toBeVisible();
  // Tokens stay on the board once one of them has moved off the crowd.
  expect(await isFullyInside(page, '.token-chip', TEST_IDS.boardGrid)).toBe(true);
});
