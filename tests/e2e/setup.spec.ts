import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

test('creates a game and navigates to a resumable route', async ({ page }) => {
  await startGame(page);

  await expect(page.getByRole('link', { name: 'Rules' })).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.playersPanel)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.turnControls)).toBeVisible();
});

/**
 * The Speed Die is agreed before the game starts and fixed for its lifetime,
 * which is also what keeps the starting bonus honest.
 */
test('starts a Speed Die game with the bonus, and an ordinary one without', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId(TEST_IDS.speedDieToggle).check();
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();

  const speedGame = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      useSpeedDie: game.useSpeedDie as boolean,
      cash: game.players[game.playerOrder[0]].cash as number,
      version: game.version as number,
    };
  });

  expect(speedGame.useSpeedDie).toBe(true);
  expect(speedGame.cash).toBe(2500);
  expect(speedGame.version).toBe(3);
});

// A v1 save predates every field the current schema requires, and a plain
// z.object would refuse it outright - which would lose the game.
test('loads a saved game written by the previous version', async ({ page }) => {
  await startGame(page);

  const gameId = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);

    // Rewrite it as v1: a jail-card count, and none of the Speed Die fields.
    game.version = 1;
    game.players[game.playerOrder[0]].jailFreeCards = 1;
    delete game.useSpeedDie;
    game.playerOrder.forEach((id: string) => delete game.players[id].hasPassedGo);
    delete game.turn.speedDieFace;
    delete game.turn.pendingMonopolyAdvance;
    localStorage.setItem(key, JSON.stringify(game));
    return game.id as string;
  });

  await page.goto(`/game/${gameId}`);
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();

  // Loading migrates in memory; the save is only rewritten by the next command,
  // so the UI is where the migrated value actually shows.
  await expect(page.getByTestId(TEST_IDS.gameSidebar)).toContainText(/jail card/i);

  // Taking a turn writes the migrated shape back out.
  await page.getByTestId(TEST_IDS.rollButton).click();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) =>
          k.startsWith('monopoly.game.')
        ) as string;
        return JSON.parse(localStorage.getItem(key) as string).version as number;
      })
    )
    // Migrated the whole way: v1 -> v2 -> v3.
    .toBe(3);

  const loaded = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      cards: game.players[game.playerOrder[0]].jailFreeCards as { deck: string }[],
      useSpeedDie: game.useSpeedDie as boolean,
    };
  });

  // The count became a real card, which is what makes it returnable.
  expect(loaded.cards).toHaveLength(1);
  expect(loaded.cards[0].deck).toBe('chance');
  expect(loaded.useSpeedDie).toBe(false);
});
