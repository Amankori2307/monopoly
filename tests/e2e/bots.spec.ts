import { expect, test, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { advanceGame } from './helpers';

/**
 * Playing on your own, against the machine.
 *
 * What only a browser can prove: that the setup form hands a bot to the engine,
 * that the page drives it with nobody clicking, and that the turn comes back to
 * the person afterwards. The policy's own decisions are unit-tested in
 * `domain/ai` - including four bots playing whole games to a winner, which is
 * far too slow to do here.
 */

/** A two-handed game: you, and one bot in the second seat. */
const startSoloGame = async (page: Page) => {
  await page.goto('/#/new');
  // Seat 2, because seat 1 is the person playing - the form refuses a table
  // with nobody at it, which is the rule this also happens to demonstrate.
  await page.getByTestId(`${TEST_IDS.playerBotToggle}-1`).check();
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page).toHaveURL(/\/game\//);
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
};

test('lets one person start a game and play it', async ({ page }) => {
  await startSoloGame(page);

  // The bot is named rather than left as "Player 2": the history, the toasts
  // and the player card all speak a player's NAME, so a bot called Player 2 is
  // indistinguishable from a person in every sentence the game says. Asserted
  // on the STACK rather than on a card by index, because the fan puts the
  // active player's card first and the turn order is drawn for first player.
  await expect(page.getByTestId(TEST_IDS.playerStack)).toContainText('Bot 2');
  await expect(page.getByTestId(TEST_IDS.playerStack)).toContainText('Player 1');
});

test('refuses a table with nobody at it', async ({ page }) => {
  await page.goto('/#/new');
  await page.getByTestId(`${TEST_IDS.playerBotToggle}-0`).check();
  await page.getByTestId(`${TEST_IDS.playerBotToggle}-1`).check();
  await page.getByRole('button', { name: 'Create game' }).click();

  // Still on the form, and told why. A game that plays itself to a winner with
  // nobody watching a decision is not harmful and is not a game.
  await expect(page).not.toHaveURL(/\/game\//);
  await expect(page.locator('.error-text')).toContainText(/bot/i);
});

/**
 * The headline. Nobody clicks anything here after the human's own turn ends -
 * the bot rolls, decides whatever its square asks of it, and passes the turn
 * back, and the only evidence a person needs is that it becomes their move
 * again.
 */
test('plays the bot turn by itself and hands the game back', async ({ page }) => {
  await startSoloGame(page);

  /**
   * The human's turn first, so the handover is a real one - and through
   * `advanceGame`, because a turn is not one click: the square may ask
   * something, a card may need acknowledging, and a double buys another roll.
   * This is the only clicking in the test, and it stops the moment the turn
   * is passed over.
   */
  let action = await advanceGame(page);
  for (let step = 0; step < 12 && action !== 'ended-turn'; step += 1) {
    action = await advanceGame(page);
  }
  expect(action).toBe('ended-turn');

  // From here on nothing is clicked. The bot has to roll, resolve its square
  // and end its own turn, and Roll coming back live is the whole proof: it is
  // gated on the active player, so it cannot be true while the bot still holds
  // the turn.
  await expect(page.getByTestId(TEST_IDS.rollButton)).toBeEnabled({ timeout: 30000 });

  // And it actually did something, rather than the turn bouncing straight back.
  await page.getByTestId(TEST_IDS.activityButton).click();
  await expect(page.getByText(/bot 2/i).first()).toBeVisible();
});
