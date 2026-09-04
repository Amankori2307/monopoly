import { expect, test } from '@playwright/test';
import { GAME_STATE_VERSION } from '../../src/domain/constants/game.constants';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * The front door reads as a game, and every number on it comes from the ruleset.
 *
 * It used to open with a project description and a "Locked v1 scope" table -
 * Persistence: LocalStorage - whose Speed Die row said "planned later" while the
 * Speed Die's own toggle sat a few centimetres below it.
 */
test('opens on a masthead a player can read, not a spec sheet', async ({ page }) => {
  await page.goto('/');

  // Titled with the ruleset it is about to start, in the board's display serif.
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveText(/India Edition/);
  await expect(title).toHaveCSS('font-family', /Fraunces/);

  await expect(page.getByTestId(TEST_IDS.rulesetGlance)).toBeVisible();
  await expect(page.getByRole('link', { name: /Read the rules/i })).toBeVisible();

  // Nothing about how it was built, and nothing calling a shipped rule unbuilt.
  const copy = (await page.locator('body').innerText()).toLowerCase();
  expect(copy).not.toContain('localstorage');
  expect(copy).not.toContain('rules engine');
  expect(copy).not.toContain('planned later');

  // The form is the reason anyone is here, so it takes the wider column - it
  // used to take the narrower one, with the room given to a recent-games list
  // that is empty on a first visit. By panel, not by the list inside it: there
  // are no saved games yet, so the list itself is not on the page.
  const [form, recent] = await Promise.all([
    page.locator('.setup-panel').boundingBox(),
    page.locator('.recent-panel').boundingBox(),
  ]);
  expect(form, 'the setup panel is not on the page').not.toBeNull();
  expect(recent, 'the recent-games panel is not on the page').not.toBeNull();
  expect((form as NonNullable<typeof form>).width).toBeGreaterThan(
    (recent as NonNullable<typeof recent>).width
  );
});

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
  expect(speedGame.version).toBe(GAME_STATE_VERSION);
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

  // Loading migrates and writes the upgraded save straight back, so both the UI
  // and the stored copy are current before any turn is taken.
  await expect(page.getByTestId(TEST_IDS.gameSidebar)).toContainText(/jail card/i);

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
    // Migrated the whole way, however many versions that is by now.
    .toBe(GAME_STATE_VERSION);

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
