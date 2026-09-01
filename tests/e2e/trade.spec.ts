import { expect, test, type Page } from '@playwright/test';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * Trading is the only way property moves between players, and the only screen
 * where both sides of a deal have to be read at once.
 */

/** Gives each player one site, on a turn where the active player can act. */
const seedOneSiteEach = async (page: Page) => {
  const seeded = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const [proposer, recipient] = game.playerOrder;
    const streets = game.board.filter(
      (space: { kind: string }) => space.kind === 'street'
    );
    const mine = streets[0];
    const theirs = streets[streets.length - 1];

    game.ownership[mine.id] = {
      ownerPlayerId: proposer,
      mortgaged: false,
      buildLevel: 0,
    };
    game.ownership[theirs.id] = {
      ownerPlayerId: recipient,
      mortgaged: false,
      buildLevel: 0,
    };
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
      mineId: mine.id as string,
      mineIndex: mine.index as number,
      theirsId: theirs.id as string,
      theirsIndex: theirs.index as number,
      proposerCash: game.players[proposer].cash as number,
      recipientCash: game.players[recipient].cash as number,
    };
  });

  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
  return seeded;
};

const readGame = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      ownership: game.ownership as Record<string, { ownerPlayerId: string | null }>,
      cash: game.playerOrder.map((id: string) => game.players[id].cash as number),
      pending: game.pendingDecision.type as string,
      tradeState: game.tradeState as unknown,
    };
  });

test('proposes a two-sided deal and carries it out on acceptance', async ({ page }) => {
  await startGame(page);
  const seeded = await seedOneSiteEach(page);

  // The way in is the opponent's own site panel.
  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, seeded.theirsIndex)).click();
  await page.getByTestId(TEST_IDS.proposeTradeButton).click();

  const builder = page.getByTestId(TEST_IDS.tradeBuilder);
  await expect(builder).toBeVisible();

  await page.getByTestId(scopedTestId(TEST_IDS.tradeSite, seeded.mineId)).check();
  await page.getByTestId(scopedTestId(TEST_IDS.tradeSite, seeded.theirsId)).check();
  await page.getByTestId(scopedTestId(TEST_IDS.tradeCash, 'offer')).fill('100');
  await page.getByTestId(TEST_IDS.tradePropose).click();

  // The other player answers.
  const response = page.getByTestId(TEST_IDS.tradeResponse);
  await expect(response).toBeVisible();
  await expect(response).toContainText(/you get/i);
  await expect(response).toContainText(/you give/i);

  await page.getByTestId(TEST_IDS.tradeAccept).click();

  const after = await readGame(page);
  expect(after.ownership[seeded.mineId].ownerPlayerId).not.toBeNull();
  expect(after.ownership[seeded.mineId].ownerPlayerId).not.toBe(
    after.ownership[seeded.theirsId].ownerPlayerId
  );
  expect(after.cash[0]).toBe(seeded.proposerCash - 100);
  expect(after.cash[1]).toBe(seeded.recipientCash + 100);
  expect(after.pending).toBe('none');
  expect(after.tradeState).toBeNull();
});

test('leaves everything alone when the offer is rejected', async ({ page }) => {
  await startGame(page);
  const seeded = await seedOneSiteEach(page);

  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, seeded.theirsIndex)).click();
  await page.getByTestId(TEST_IDS.proposeTradeButton).click();
  await page.getByTestId(scopedTestId(TEST_IDS.tradeSite, seeded.mineId)).check();
  await page.getByTestId(TEST_IDS.tradePropose).click();

  await page.getByTestId(TEST_IDS.tradeReject).click();

  const after = await readGame(page);
  expect(after.cash[0]).toBe(seeded.proposerCash);
  expect(after.pending).toBe('none');
  expect(after.tradeState).toBeNull();
  // The turn is handed straight back, not consumed by the failed offer.
  await expect(page.getByTestId(TEST_IDS.endTurnButton)).toBeVisible();
});

// A trade has to move something, and the builder says so on the button rather
// than letting the engine throw.
test('will not send an empty offer', async ({ page }) => {
  await startGame(page);
  const seeded = await seedOneSiteEach(page);

  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, seeded.theirsIndex)).click();
  await page.getByTestId(TEST_IDS.proposeTradeButton).click();

  const send = page.getByTestId(TEST_IDS.tradePropose);
  await expect(send).toBeDisabled();
  await expect(send).toHaveAttribute('title', /move something/i);
});

// The printed rule lets the receiver of a mortgaged site either clear the
// mortgage now or pay the 10% and take it as it stands.
test('lets the receiver choose what to do about a mortgaged site', async ({ page }) => {
  await startGame(page);
  const seeded = await seedOneSiteEach(page);

  const mortgaged = await page.evaluate((mineId) => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    game.ownership[mineId].mortgaged = true;
    localStorage.setItem(key, JSON.stringify(game));
    const site = game.board.find((space: { id: string }) => space.id === mineId);
    return {
      mortgageValue: site.mortgageValue as number,
      recipientCash: game.players[game.playerOrder[1]].cash as number,
    };
  }, seeded.mineId);
  await page.reload();

  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, seeded.theirsIndex)).click();
  await page.getByTestId(TEST_IDS.proposeTradeButton).click();
  await page.getByTestId(scopedTestId(TEST_IDS.tradeSite, seeded.mineId)).check();
  await page.getByTestId(TEST_IDS.tradePropose).click();

  // Keeping it mortgaged is the default, because it costs less.
  await expect(
    page.getByTestId(scopedTestId(TEST_IDS.tradeMortgageKeep, seeded.mineId))
  ).toBeChecked();

  await page
    .getByTestId(scopedTestId(TEST_IDS.tradeMortgageRedeem, seeded.mineId))
    .check();
  await page.getByTestId(TEST_IDS.tradeAccept).click();

  const after = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      ownership: game.ownership as Record<string, { mortgaged: boolean }>,
      recipientCash: game.players[game.playerOrder[1]].cash as number,
    };
  });

  // Cleared as part of the transfer, paid for with value plus 10%.
  expect(after.ownership[seeded.mineId].mortgaged).toBe(false);
  const interest = Math.ceil(mortgaged.mortgageValue * 0.1);
  expect(after.recipientCash).toBe(
    mortgaged.recipientCash - mortgaged.mortgageValue - interest
  );
});
