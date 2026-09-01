import { expect, test, type Page } from '@playwright/test';
import { HOTEL_BUILD_LEVEL } from '../../src/domain/constants/game.constants';
import { PropertyAction } from '../../src/domain/types/game.enums';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * Building is what finally reaches the rent tiers the deed has always printed.
 * These drive it through the UI the player actually uses: the site panel.
 */

/** Gives the active player a whole colour set, and the cash to build on it. */
const seedCompleteSet = async (page: Page, levels: number[] = [0, 0]) => {
  const seeded = await page.evaluate((buildLevels) => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const owner = game.playerOrder[0];
    const group = game.board.find(
      (space: { kind: string }) => space.kind === 'street'
    ).colorGroup;
    const sites = game.board.filter(
      (space: { kind: string; colorGroup?: string }) =>
        space.kind === 'street' && space.colorGroup === group
    );

    sites.forEach((site: { id: string }, index: number) => {
      game.ownership[site.id] = {
        ownerPlayerId: owner,
        mortgaged: false,
        buildLevel: buildLevels[index] ?? 0,
      };
    });
    game.players[owner].cash = 5000;
    game.activePlayerIndex = 0;
    game.turn = {
      phase: 'turn_complete',
      doublesCount: 0,
      lastRoll: [3, 4],
      canRollAgain: false,
      reason: 'done',
      speedDieFace: null,
      pendingMonopolyAdvance: false,
    };
    localStorage.setItem(key, JSON.stringify(game));

    return {
      indices: sites.map((site: { index: number }) => site.index),
      houseCost: sites[0].houseCost as number,
      cash: game.players[owner].cash as number,
      housesAvailable: game.bank.housesAvailable as number,
    };
  }, levels);

  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
  return seeded;
};

/** Reads the saved game, which is the engine's own record of what happened. */
const readGame = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      ownership: game.ownership as Record<string, { buildLevel: number }>,
      cash: game.players[game.playerOrder[0]].cash as number,
      housesAvailable: game.bank.housesAvailable as number,
      hotelsAvailable: game.bank.hotelsAvailable as number,
      board: game.board as { id: string; index: number }[],
    };
  });

const openSite = async (page: Page, index: number) => {
  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, index)).click();
  await expect(page.getByTestId(TEST_IDS.spaceDetailCard)).toBeVisible();
};

const siteAction = (page: Page, action: PropertyAction) =>
  page.getByTestId(scopedTestId(TEST_IDS.siteAction, action));

test('builds a house from the site panel and shows it on the board', async ({ page }) => {
  await startGame(page);
  const seeded = await seedCompleteSet(page);

  await openSite(page, seeded.indices[0]);
  await expect(siteAction(page, PropertyAction.Build)).toBeEnabled();
  await siteAction(page, PropertyAction.Build).click();

  const after = await readGame(page);
  const siteId = after.board.find((space) => space.index === seeded.indices[0])
    ?.id as string;
  expect(after.ownership[siteId].buildLevel).toBe(1);
  expect(after.cash).toBe(seeded.cash - seeded.houseCost);
  expect(after.housesAvailable).toBe(seeded.housesAvailable - 1);

  // The pip rides the colour ribbon, which is what makes a built site readable
  // from the board rather than only from its deed.
  await page.getByTestId(TEST_IDS.spaceDetailCard).press('Escape');
  await expect(
    page.getByTestId(scopedTestId(TEST_IDS.spaceBuildings, seeded.indices[0]))
  ).toBeVisible();
});

// The even rule is the one players forget: a second house here while the rest
// of the set has none is illegal.
test('refuses an uneven build, and says why', async ({ page }) => {
  await startGame(page);
  const seeded = await seedCompleteSet(page, [1, 0]);

  await openSite(page, seeded.indices[0]);

  const build = siteAction(page, PropertyAction.Build);
  await expect(build).toBeDisabled();
  await expect(build).toHaveAttribute('title', /colour set up first/i);
});

test('upgrades four houses into a hotel and returns the houses', async ({ page }) => {
  await startGame(page);
  const seeded = await seedCompleteSet(page, [4, 4]);

  await openSite(page, seeded.indices[0]);
  await expect(siteAction(page, PropertyAction.Build)).toHaveText(/hotel/i);
  await siteAction(page, PropertyAction.Build).click();

  const after = await readGame(page);
  const siteId = after.board.find((space) => space.index === seeded.indices[0])
    ?.id as string;
  expect(after.ownership[siteId].buildLevel).toBe(HOTEL_BUILD_LEVEL);
  expect(after.housesAvailable).toBe(seeded.housesAvailable + 4);
});

test('sells a house back to the bank for half', async ({ page }) => {
  await startGame(page);
  const seeded = await seedCompleteSet(page, [1, 1]);

  await openSite(page, seeded.indices[0]);
  await siteAction(page, PropertyAction.Sell).click();

  const after = await readGame(page);
  const siteId = after.board.find((space) => space.index === seeded.indices[0])
    ?.id as string;
  expect(after.ownership[siteId].buildLevel).toBe(0);
  expect(after.cash).toBe(seeded.cash + Math.floor(seeded.houseCost / 2));
  expect(after.housesAvailable).toBe(seeded.housesAvailable + 1);
});

// Buildings block mortgaging their whole colour set, so a built-up player who
// cannot pay must be able to sell them - otherwise they are bankrupt while
// still holding hotels.
test('offers building sales inside the liquidation panel', async ({ page }) => {
  await startGame(page);
  const seeded = await seedCompleteSet(page, [2, 2]);

  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const [debtor, creditor] = game.playerOrder;
    game.players[debtor].cash = 5;
    game.pendingDecision = {
      type: 'asset-liquidation',
      playerId: debtor,
      amountDue: 60,
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
  });
  await page.reload();

  const panel = page.getByTestId(TEST_IDS.liquidationDecision);
  await expect(panel).toBeVisible();
  // No dead end while there are still buildings to sell.
  await expect(page.getByTestId(TEST_IDS.liquidationDeadEnd)).toHaveCount(0);

  const before = await readGame(page);
  const siteId = before.board.find((space) => space.index === seeded.indices[0])
    ?.id as string;
  await page.getByTestId(scopedTestId(TEST_IDS.liquidationSell, siteId)).click();

  const after = await readGame(page);
  expect(after.ownership[siteId].buildLevel).toBe(1);
  // The debt is still standing: selling raises cash, it does not settle it.
  await expect(panel).toBeVisible();
});

/**
 * The printed rule: when the bank cannot satisfy everyone who could build, the
 * last buildings go to auction rather than to whoever asked first.
 */
test('auctions the last house when two players could use it', async ({ page }) => {
  await startGame(page);

  const seeded = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const [first, second] = game.playerOrder;
    const streets = game.board.filter(
      (space: { kind: string }) => space.kind === 'street'
    );

    // A complete colour set each, so both could legally build.
    const groups: Record<string, { id: string; index: number }[]> = {};
    streets.forEach((space: { colorGroup: string; id: string; index: number }) => {
      groups[space.colorGroup] = groups[space.colorGroup] ?? [];
      groups[space.colorGroup].push(space);
    });
    const names = Object.keys(groups);
    groups[names[0]].forEach((space) => {
      game.ownership[space.id] = {
        ownerPlayerId: first,
        mortgaged: false,
        buildLevel: 0,
      };
    });
    groups[names[1]].forEach((space) => {
      game.ownership[space.id] = {
        ownerPlayerId: second,
        mortgaged: false,
        buildLevel: 0,
      };
    });

    // One house left in the bank: that is the contention.
    game.bank.housesAvailable = 1;
    game.players[first].cash = 5000;
    game.players[second].cash = 5000;
    game.activePlayerIndex = 0;
    game.turn = {
      phase: 'turn_complete',
      doublesCount: 0,
      lastRoll: [3, 4],
      canRollAgain: false,
      reason: 'done',
      speedDieFace: null,
      pendingMonopolyAdvance: false,
    };
    localStorage.setItem(key, JSON.stringify(game));

    return { siteIndex: groups[names[0]][0].index as number };
  });
  await page.reload();

  // Asking to build opens an auction instead of building.
  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, seeded.siteIndex)).click();
  await page.getByTestId(scopedTestId(TEST_IDS.siteAction, PropertyAction.Build)).click();

  await expect(page.getByTestId(TEST_IDS.auctionDecision)).toBeVisible();

  await page.getByTestId(TEST_IDS.bidInput).fill('120');
  await page.getByTestId(TEST_IDS.submitBidButton).click();
  await page.getByTestId(TEST_IDS.passAuctionButton).click();

  // The winner says where it goes - the auction sold the house, not the site.
  const placement = page.getByTestId(TEST_IDS.buildingPlacement);
  await expect(placement).toBeVisible();
  await expect(placement).toContainText('₹120');

  await placement
    .locator(`[data-testid^="${TEST_IDS.buildingPlacementSite}-"]`)
    .first()
    .click();

  const after = await readGame(page);
  expect(after.housesAvailable).toBe(0);
  expect(Object.values(after.ownership).some((entry) => entry.buildLevel === 1)).toBe(
    true
  );
});
