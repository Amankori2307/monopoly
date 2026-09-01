import { expect, test, type Page } from '@playwright/test';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * The Speed Die changes the turn loop, so these drive it from the board rather
 * than from the engine: the faces that need an answer are the point of it.
 */

/** Seeds a live Speed Die turn showing the given face, ready to be answered. */
const seedFace = async (
  page: Page,
  decision: Record<string, unknown>,
  face: string,
  position = 0
) => {
  await page.evaluate(
    ({ pendingDecision, speedDieFace, at }) => {
      const key = Object.keys(localStorage).find((k) =>
        k.startsWith('monopoly.game.')
      ) as string;
      const game = JSON.parse(localStorage.getItem(key) as string);
      const playerId = game.playerOrder[0];

      game.useSpeedDie = true;
      game.activePlayerIndex = 0;
      game.playerOrder.forEach((id: string) => {
        game.players[id].hasPassedGo = true;
      });
      game.players[playerId].position = at;
      game.pendingDecision = { ...pendingDecision, playerId };
      game.turn = {
        phase: 'await_decision',
        doublesCount: 0,
        lastRoll: [2, 5],
        canRollAgain: false,
        reason: 'speed die',
        speedDieFace,
        pendingMonopolyAdvance: false,
      };
      localStorage.setItem(key, JSON.stringify(game));
    },
    { pendingDecision: decision, speedDieFace: face, at: position }
  );

  await page.reload();
};

const readPosition = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return game.players[game.playerOrder[0]].position as number;
  });

test('shows the third die beside the white dice', async ({ page }) => {
  await startGame(page);
  await seedFace(page, { type: 'speed-die-bus', whiteDice: [2, 5] }, 'bus');

  const speedDie = page.getByTestId(TEST_IDS.speedDieFace);
  await expect(speedDie).toBeVisible();
  await expect(speedDie).toHaveText(/bus/i);

  // Still two white dice: the Speed Die is not one of them.
  await expect(page.getByTestId(scopedTestId(TEST_IDS.dieFace, 0))).toBeVisible();
  await expect(page.getByTestId(scopedTestId(TEST_IDS.dieFace, 1))).toBeVisible();
});

// One die, the other, or both - and nothing in between.
test('offers exactly the three bus moves', async ({ page }) => {
  await startGame(page);
  await seedFace(page, { type: 'speed-die-bus', whiteDice: [2, 5] }, 'bus');

  const panel = page.getByTestId(TEST_IDS.busDecision);
  await expect(panel).toBeVisible();
  await expect(page.getByTestId(scopedTestId(TEST_IDS.busChoice, 2))).toBeVisible();
  await expect(page.getByTestId(scopedTestId(TEST_IDS.busChoice, 5))).toBeVisible();
  await expect(page.getByTestId(scopedTestId(TEST_IDS.busChoice, 7))).toBeVisible();

  await page.getByTestId(scopedTestId(TEST_IDS.busChoice, 5)).click();

  expect(await readPosition(page)).toBe(5);
});

test('lets a triple move to any space on the board', async ({ page }) => {
  await startGame(page);
  await seedFace(page, { type: 'speed-die-destination' }, '2');

  const panel = page.getByTestId(TEST_IDS.destinationDecision);
  await expect(panel).toBeVisible();

  const target = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    // Free Parking: somewhere that raises no decision of its own.
    const space = game.board.find((s: { kind: string }) => s.kind === 'free-parking');
    return { id: space.id as string, index: space.index as number };
  });

  await page.getByTestId(scopedTestId(TEST_IDS.destinationChoice, target.id)).click();

  expect(await readPosition(page)).toBe(target.index);
});

// A game without the Speed Die must look exactly as it did.
test('shows no third die in an ordinary game', async ({ page }) => {
  await startGame(page);

  await expect(page.getByTestId(TEST_IDS.speedDieFace)).toHaveCount(0);
  await expect(page.getByTestId(scopedTestId(TEST_IDS.dieFace, 0))).toBeVisible();
});
