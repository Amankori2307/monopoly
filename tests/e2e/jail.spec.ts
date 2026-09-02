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

/** How many events the game has logged, which every Jail attempt adds to. */
const eventCount = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    return (JSON.parse(localStorage.getItem(key) as string).history as unknown[]).length;
  });

/**
 * Rolls for doubles and waits for the dice to land.
 *
 * The Jail roll tumbles before it commits, the same as every other roll in the
 * game - it used to dispatch straight out, with no animation and no sound. So
 * the state cannot be read on the click; the roll is logged when it lands.
 */
const rollForDoubles = async (page: Page) => {
  const before = await eventCount(page);
  await page.getByTestId(TEST_IDS.jailRollButton).click();
  await expect.poll(() => eventCount(page), { timeout: 5000 }).toBeGreaterThan(before);
};

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

test('allows one attempt per turn, and hands the turn back on a failure', async ({
  page,
}) => {
  await startGame(page);
  const { cash } = await jailActivePlayer(page);

  await rollForDoubles(page);
  const state = await jailedState(page);

  if (!state.inJail) {
    // Rolled a double and left - legal, and free.
    expect(state.cash).toBe(cash);
    return;
  }

  // Nothing charged, and the turn is over: the panel goes away rather than
  // offering another roll, so End Turn is reachable instead of covered.
  expect(state.cash).toBe(cash);
  expect(state.served).toBe(1);
  await expect(page.getByTestId(TEST_IDS.jailRollButton)).toHaveCount(0);
  await expect(page.getByTestId(TEST_IDS.decisionModal)).toHaveCount(0);
  await expect(page.getByTestId(TEST_IDS.endTurnButton)).toBeVisible();
});

test('charges nothing until the third turn in Jail', async ({ page }) => {
  await startGame(page);
  const { cash } = await jailActivePlayer(page);

  // Three of this player's own turns, each seeded at its start the way the turn
  // rotation would leave it - the point being that the fine waits for the third.
  for (let turn = 1; turn <= MAX_JAIL_TURNS; turn += 1) {
    const before = await jailedState(page);
    if (!before.inJail) break;

    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.startsWith('monopoly.game.')
      ) as string;
      const game = JSON.parse(localStorage.getItem(key) as string);
      game.activePlayerIndex = 0;
      game.turn.phase = 'await_decision';
      localStorage.setItem(key, JSON.stringify(game));
    });
    await page.reload();

    await rollForDoubles(page);
    const after = await jailedState(page);

    if (turn < MAX_JAIL_TURNS && after.inJail) {
      expect(after.cash).toBe(cash);
      expect(after.position).toBe(JAIL_POSITION);
    }
  }

  const final = await jailedState(page);
  if (!final.inJail && final.served === 0) {
    // Left Jail. Either they rolled a double (free) or served all three (fined).
    expect(final.cash === cash || final.cash <= cash - JAIL_FINE).toBe(true);
  }
});

test('says which attempt the player is on', async ({ page }) => {
  await startGame(page);
  await jailActivePlayer(page);

  const panel = page.getByTestId(TEST_IDS.decisionModal);
  await expect(panel).toContainText(new RegExp(`of ${MAX_JAIL_TURNS}`));
});
