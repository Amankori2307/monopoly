import { expect, test, type Page } from '@playwright/test';
import { MAX_PLAYERS } from '../../src/domain/constants/game.constants';
import { PropertyAction } from '../../src/domain/types/game.enums';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * asset-liquidation used to be a dead end: a player who could not pay was stuck
 * for the rest of the game. Mortgaging is the way out, and the panel has to
 * offer it itself - the decision modal covers the board.
 */

/** Seeds a debt the active player cannot cover, plus sites to mortgage. */
const seedUnpayableDebt = async (
  page: Page,
  options: { siteCount: number; cash: number; amountDue: number }
) => {
  const seeded = await page.evaluate((input) => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const [debtor, creditor] = game.playerOrder;
    const streets = game.board.filter((s: { kind: string }) => s.kind === 'street');

    Object.keys(game.ownership).forEach((id) => {
      game.ownership[id] = { ownerPlayerId: null, mortgaged: false, buildLevel: 0 };
    });
    // Spread the picks across colour groups so no group is complete - a
    // complete group would be fine, but this keeps the fixture unambiguous.
    const picked = [0, 4, 8].slice(0, input.siteCount);
    picked.forEach((index: number) => {
      game.ownership[streets[index].id] = {
        ownerPlayerId: debtor,
        mortgaged: false,
        buildLevel: 0,
      };
    });

    game.players[debtor].cash = input.cash;
    game.activePlayerIndex = game.playerOrder.indexOf(debtor);
    game.pendingDecision = {
      type: 'asset-liquidation',
      playerId: debtor,
      amountDue: input.amountDue,
      creditorPlayerId: creditor,
      reason: 'rent on Delhi',
    };
    game.turn = {
      phase: 'await_decision',
      doublesCount: 0,
      lastRoll: [3, 4],
      canRollAgain: false,
      reason: 'rent',
    };
    localStorage.setItem(key, JSON.stringify(game));

    return {
      creditorCash: game.players[creditor].cash as number,
      mortgageValues: picked.map(
        (index: number) => streets[index].mortgageValue as number
      ),
    };
  }, options);

  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
  return seeded;
};

const debtorCash = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return game.players[game.playerOrder[0]].cash as number;
  });

test('a player who cannot pay can mortgage their way out', async ({ page }) => {
  await startGame(page);
  const { creditorCash, mortgageValues } = await seedUnpayableDebt(page, {
    siteCount: 3,
    cash: 150,
    amountDue: 200,
  });

  const panel = page.getByTestId(TEST_IDS.liquidationDecision);
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('₹200');
  // Rolling is blocked and the debt cannot be paid yet.
  await expect(page.getByTestId(TEST_IDS.rollButton)).toBeDisabled();
  await expect(page.getByTestId(TEST_IDS.liquidationSettle)).toBeDisabled();

  // Mortgage the largest site, which covers the shortfall on its own.
  const largest = Math.max(...mortgageValues);
  await panel
    .locator(`[data-testid^="${TEST_IDS.liquidationMortgage}-"]`)
    .filter({ hasText: `₹${largest}` })
    .click();

  expect(await debtorCash(page)).toBe(150 + largest);
  // Mortgaging must not clear the debt - that was the shape of the original bug.
  await expect(panel).toBeVisible();

  const settle = page.getByTestId(TEST_IDS.liquidationSettle);
  await expect(settle).toBeEnabled();
  await settle.click();

  // The deadlock is gone: the panel closes and the creditor is actually paid.
  await expect(panel).toHaveCount(0);
  const paid = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      creditor: game.players[game.playerOrder[1]].cash as number,
      pending: game.pendingDecision.type as string,
    };
  });
  expect(paid.creditor).toBe(creditorCash + 200);
  expect(paid.pending).toBe('none');
});

// Until bankruptcy lands, a player with nothing left is told so plainly rather
// than left staring at a modal with no way forward.
test('says so plainly when there is nothing left to mortgage', async ({ page }) => {
  await startGame(page);
  await seedUnpayableDebt(page, { siteCount: 0, cash: 10, amountDue: 200 });

  await expect(page.getByTestId(TEST_IDS.liquidationDeadEnd)).toContainText(
    /nothing left to mortgage/i
  );
  await expect(page.getByTestId(TEST_IDS.liquidationSettle)).toBeDisabled();
  await expect(
    page.locator(`[data-testid^="${TEST_IDS.liquidationMortgage}-"]`)
  ).toHaveCount(0);
});

test('the site panel can mortgage and redeem a site directly', async ({ page }) => {
  await startGame(page);
  const streetIndex = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const street = game.board.find((s: { kind: string }) => s.kind === 'street');
    game.ownership[street.id] = {
      ownerPlayerId: game.playerOrder[game.activePlayerIndex],
      mortgaged: false,
      buildLevel: 0,
    };
    localStorage.setItem(key, JSON.stringify(game));
    return street.index as number;
  });
  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();

  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, streetIndex)).click();
  const mortgage = page.getByTestId(`${TEST_IDS.siteAction}-${PropertyAction.Mortgage}`);
  // No longer "Not implemented yet".
  await expect(mortgage).toBeEnabled();
  await mortgage.click();

  // The panel updates in place - no need to close and reopen it. The deed now
  // reads as mortgaged and Redeem has taken Mortgage's place.
  await expect(page.getByTestId(TEST_IDS.deedMortgaged)).toBeVisible();
  await expect(
    page.getByTestId(`${TEST_IDS.siteAction}-${PropertyAction.Redeem}`)
  ).toBeEnabled();
  await expect(mortgage).toBeDisabled();
});

test('a full table can still play after a debt is settled', async ({ page }) => {
  await startGame(page, { players: MAX_PLAYERS });
  await seedUnpayableDebt(page, { siteCount: 3, cash: 150, amountDue: 200 });

  await page.locator(`[data-testid^="${TEST_IDS.liquidationMortgage}-"]`).first().click();
  // ₹30 is not enough on its own, so the next one is still offered.
  await expect(
    page.locator(`[data-testid^="${TEST_IDS.liquidationMortgage}-"]`).first()
  ).toBeVisible();
});
