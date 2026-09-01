import { expect, test, type Page } from '@playwright/test';
import {
  JAIL_FINE,
  JAIL_POSITION,
  MAX_JAIL_TURNS,
} from '../../src/domain/constants/game.constants';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * A player in Jail gets three attempts at doubles before the fine is forced on
 * them, and this is the test that proves they can actually take them.
 *
 * The rule was implemented in the engine and unreachable in the app: the jail
 * panel offered only "Pay" and "Use jail card", and the only control that rolled
 * for doubles was the dice dock - underneath the decision modal's full-viewport
 * backdrop. Every e2e path paid the fine, because the helpers checked for the
 * Pay button before the roll button, so nothing ever tried.
 */

const jailActivePlayer = async (page: Page) => {
  const seeded = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const playerId = game.playerOrder[0];

    game.activePlayerIndex = 0;
    game.players[playerId].inJail = true;
    game.players[playerId].jailTurnsServed = 0;
    game.players[playerId].position = 10;
    game.pendingDecision = { type: 'jail-choice', playerId };
    game.turn = {
      phase: 'await_roll',
      doublesCount: 0,
      lastRoll: null,
      canRollAgain: false,
      reason: null,
      speedDieFace: null,
      pendingMonopolyAdvance: false,
    };
    localStorage.setItem(key, JSON.stringify(game));
    return { cash: game.players[playerId].cash as number };
  });

  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
  return seeded;
};

const jailedState = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const player = game.players[game.playerOrder[0]];
    return {
      cash: player.cash as number,
      inJail: player.inJail as boolean,
      served: player.jailTurnsServed as number,
      position: player.position as number,
    };
  });

test('offers a jailed player the choice to try for doubles', async ({ page }) => {
  await startGame(page);
  await jailActivePlayer(page);

  const panel = page.getByTestId(TEST_IDS.decisionModal);
  await expect(panel).toBeVisible();

  // All three ways out, in the one place the player is looking.
  await expect(page.getByTestId(TEST_IDS.jailRollButton)).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Pay / })).toBeVisible();
  await expect(panel.getByRole('button', { name: /jail card/i })).toBeVisible();
});

test('takes three attempts, and charges nothing until the third', async ({ page }) => {
  await startGame(page);
  const { cash } = await jailActivePlayer(page);

  // Attempts one and two: the fine is not charged, whatever the dice said.
  for (let attempt = 1; attempt < MAX_JAIL_TURNS; attempt += 1) {
    await page.getByTestId(TEST_IDS.jailRollButton).click();
    const state = await jailedState(page);

    if (!state.inJail) {
      // Rolled a double and left early - legal, and nothing was charged for it.
      expect(state.cash).toBe(cash);
      return;
    }
    expect(state.served).toBe(attempt);
    expect(state.cash).toBe(cash);
    expect(state.position).toBe(JAIL_POSITION);
  }

  // The third failure is where the fine lands.
  await page.getByTestId(TEST_IDS.jailRollButton).click();
  const final = await jailedState(page);

  if (final.inJail) {
    // Only if they could not cover it, which they can here.
    throw new Error('Expected the third attempt to resolve the stay in Jail');
  }
  expect(final.cash).toBeLessThanOrEqual(cash - JAIL_FINE);
});

test('says which attempt the player is on', async ({ page }) => {
  await startGame(page);
  await jailActivePlayer(page);

  const panel = page.getByTestId(TEST_IDS.decisionModal);
  await expect(panel).toContainText(new RegExp(`of ${MAX_JAIL_TURNS}`));
});
