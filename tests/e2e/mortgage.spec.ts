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
      speedDieFace: null,
      pendingMonopolyAdvance: false,
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

// A debt beyond everything you hold is what bankruptcy means, so the panel
// offers it rather than stranding the player.
test('offers bankruptcy when there is nothing left to mortgage', async ({ page }) => {
  await startGame(page);
  await seedUnpayableDebt(page, { siteCount: 0, cash: 10, amountDue: 200 });

  await expect(page.getByTestId(TEST_IDS.liquidationDeadEnd)).toContainText(
    /nothing left to mortgage/i
  );
  await expect(
    page.locator(`[data-testid^="${TEST_IDS.liquidationMortgage}-"]`)
  ).toHaveCount(0);

  await page.getByTestId(TEST_IDS.declareBankruptcy).click();

  // The decision clears and the creditor has taken what there was.
  await expect(page.getByTestId(TEST_IDS.liquidationDecision)).toHaveCount(0);
  const outcome = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      pending: game.pendingDecision.type as string,
      debtorOut: game.players[game.playerOrder[0]].isBankrupt as boolean,
      rank: game.players[game.playerOrder[0]].bankruptcyRank as number,
    };
  });
  // Two players, so this bankruptcy also ends the game - see the win test below.
  expect(outcome.pending).toBe('game-over');
  expect(outcome.debtorOut).toBe(true);
  expect(outcome.rank).toBe(1);
});

// Bankruptcy is for a debt you cannot meet, not one you would rather not.
test('does not offer bankruptcy while the debt is still reachable', async ({ page }) => {
  await startGame(page);
  await seedUnpayableDebt(page, { siteCount: 3, cash: 150, amountDue: 200 });

  await expect(page.getByTestId(TEST_IDS.liquidationSettle)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.declareBankruptcy)).toHaveCount(0);
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

/**
 * A game can now be played to its end. Bankruptcy is the only way a player
 * leaves, so it is the only way a game is won.
 */
test('declares a winner when the last opponent goes bankrupt', async ({ page }) => {
  await startGame(page);
  await seedUnpayableDebt(page, { siteCount: 0, cash: 10, amountDue: 200 });

  await page.getByTestId(TEST_IDS.declareBankruptcy).click();

  const gameOver = page.getByTestId(TEST_IDS.gameOverDecision);
  await expect(gameOver).toBeVisible();
  await expect(gameOver).toContainText(/wins/i);

  const finished = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      status: game.status as string,
      winner: game.winnerPlayerId as string | null,
      survivor: game.playerOrder[1] as string,
    };
  });
  expect(finished.status).toBe('completed');
  expect(finished.winner).toBe(finished.survivor);

  // Every turn control has to go: the engine throws on any command once the
  // game is complete, so an enabled button is a crash waiting to be clicked.
  await expect(page.getByTestId(TEST_IDS.rollButton)).toBeDisabled();
  await expect(page.getByTestId(TEST_IDS.endTurnButton)).toHaveCount(0);

  // The modal cannot be dismissed, so it offers the way back itself.
  await page.getByTestId(TEST_IDS.gameOverHome).click();
  await expect(page).toHaveURL(/\/$/);
});

/**
 * One card can leave several players unable to pay. Before the queue, everyone
 * after the first was silently forgiven.
 */
test('works through every debt one card leaves behind', async ({ page }) => {
  await startGame(page, { players: 3 });

  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const [collector, brokeOne, brokeTwo] = game.playerOrder;

    game.activePlayerIndex = 0;
    game.players[brokeOne].cash = 10;
    game.players[brokeTwo].cash = 10;
    // Two debts owed to the same collector, the second queued behind the first.
    game.pendingDecision = {
      type: 'asset-liquidation',
      playerId: brokeOne,
      amountDue: 100,
      creditorPlayerId: collector,
      reason: 'birthday money',
      queued: [
        {
          playerId: brokeTwo,
          amountDue: 100,
          creditorPlayerId: collector,
          reason: 'birthday money',
        },
      ],
    };
    game.turn = {
      phase: 'await_decision',
      doublesCount: 0,
      lastRoll: [3, 4],
      canRollAgain: false,
      reason: 'birthday money',
      speedDieFace: null,
      pendingMonopolyAdvance: false,
    };
    localStorage.setItem(key, JSON.stringify(game));
  });
  await page.reload();

  // The panel says another debt is waiting, rather than springing it later.
  await expect(page.getByTestId(TEST_IDS.liquidationQueued)).toContainText(
    /1 more debt/i
  );

  // Neither can pay, so both go bankrupt in turn - and the second debt survives
  // the first player leaving.
  await page.getByTestId(TEST_IDS.declareBankruptcy).click();
  await expect(page.getByTestId(TEST_IDS.liquidationDecision)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.liquidationQueued)).toHaveCount(0);

  const second = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      pendingPlayer: game.pendingDecision.playerId as string,
      secondPlayer: game.playerOrder[2] as string,
      firstOut: game.players[game.playerOrder[1]].isBankrupt as boolean,
    };
  });
  expect(second.firstOut).toBe(true);
  expect(second.pendingPlayer).toBe(second.secondPlayer);
});

/**
 * A bankruptcy to the bank returns everything at once, and the printed rule has
 * the bank auction each property rather than leaving it lying unowned.
 */
test("auctions a bankrupt player's sites, one after another", async ({ page }) => {
  await startGame(page, { players: 3 });

  const seeded = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const debtor = game.playerOrder[0];
    const streets = game.board.filter(
      (space: { kind: string }) => space.kind === 'street'
    );
    const owned = streets.slice(0, 2);

    owned.forEach((site: { id: string }) => {
      game.ownership[site.id] = {
        ownerPlayerId: debtor,
        mortgaged: false,
        buildLevel: 0,
      };
    });
    game.players[debtor].cash = 0;
    game.activePlayerIndex = 0;
    // Owed to the Bank, which is what sends the sites to auction.
    game.pendingDecision = {
      type: 'asset-liquidation',
      playerId: debtor,
      amountDue: 99999,
      creditorPlayerId: null,
      reason: 'Super Tax',
      queued: [],
    };
    game.turn = {
      phase: 'await_decision',
      doublesCount: 0,
      lastRoll: [3, 4],
      canRollAgain: false,
      reason: 'Super Tax',
      speedDieFace: null,
      pendingMonopolyAdvance: false,
    };
    localStorage.setItem(key, JSON.stringify(game));

    return { first: owned[0].name as string, second: owned[1].name as string };
  });
  await page.reload();

  await page.getByTestId(TEST_IDS.declareBankruptcy).click();

  // The first site goes straight to auction rather than lying unowned.
  const auction = page.getByTestId(TEST_IDS.auctionDecision);
  await expect(auction).toBeVisible();
  await expect(auction).toContainText(seeded.first);

  // Somebody takes it.
  await page.getByTestId(TEST_IDS.bidInput).fill('60');
  await page.getByTestId(TEST_IDS.submitBidButton).click();
  await page.getByTestId(TEST_IDS.passAuctionButton).click();

  // And the queue moves on to the next one by itself.
  await expect(auction).toContainText(seeded.second);

  const state = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const owners = Object.values(
      game.ownership as Record<string, { ownerPlayerId: string | null }>
    )
      .map((entry) => entry.ownerPlayerId)
      .filter(Boolean);
    return { queue: game.pendingAuctionSpaceIds as string[], ownedCount: owners.length };
  });
  expect(state.queue).toEqual([]);
  expect(state.ownedCount).toBe(1);
});
