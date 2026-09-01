import { expect, test, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * How a token travels: every move walked, in the direction the engine recorded.
 *
 * The animation used to infer direction from the position change and cap the
 * walk at a dice roll, so "Advance to GO" teleported, a backward card snapped,
 * and Go To Jail from a nearby Chance space strolled in like an ordinary move.
 */

/** Where each token is being drawn, by player id. */
const tokenSpaces = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('.board-token-layer .token-chip')).map(
      (token) =>
        `${(token as HTMLElement).style.left},${(token as HTMLElement).style.top}`
    )
  );

/**
 * Puts the active player on a space with a card already drawn and pending.
 *
 * Seeded rather than played to, because reaching a chosen card by rolling means
 * waiting on real dice and a shuffled deck.
 */
const seedDrawnCard = async (
  page: Page,
  position: number,
  effect: Record<string, unknown>
) => {
  const seeded = await page.evaluate(
    ({ atSpace, cardEffect }) => {
      const key = Object.keys(localStorage).find((k) =>
        k.startsWith('monopoly.game.')
      ) as string;
      const game = JSON.parse(localStorage.getItem(key) as string);
      const activePlayerId = game.playerOrder[game.activePlayerIndex];

      game.players[activePlayerId].position = atSpace;
      game.players[activePlayerId].lastMove = null;
      game.pendingDecision = {
        type: 'card-draw',
        playerId: activePlayerId,
        deck: 'chance',
        card: {
          id: 'seeded-card',
          deck: 'chance',
          title: 'Seeded card',
          description: 'A card put here by the test.',
          effect: cardEffect,
        },
      };
      game.turn = {
        phase: 'await_decision',
        doublesCount: 0,
        lastRoll: [3, 4],
        canRollAgain: false,
        reason: 'Card drawn',
        speedDieFace: null,
        pendingMonopolyAdvance: false,
      };
      localStorage.setItem(key, JSON.stringify(game));

      return {
        cash: game.players[activePlayerId].cash as number,
        playerId: activePlayerId as string,
      };
    },
    { atSpace: position, cardEffect: effect }
  );

  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
  return seeded;
};

/** The player's position and cash, straight out of the store's save. */
const readPlayer = (page: Page, playerId: string) =>
  page.evaluate((id) => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    return {
      position: game.players[id].position as number,
      cash: game.players[id].cash as number,
      lastMove: game.players[id].lastMove as string | null,
    };
  }, playerId);

test.describe('token movement', () => {
  test.beforeEach(async ({ page }) => {
    await startGame(page);
  });

  /**
   * The complaint that started this: it should do a full round and then come.
   * Sampling for distinct intermediate positions is what tells a walk from a
   * jump - a teleport produces exactly two.
   */
  test('walks the whole way round on an advance to GO', async ({ page }) => {
    const seeded = await seedDrawnCard(page, 20, {
      kind: 'move-to',
      index: 0,
      collectGo: true,
    });

    const seen = new Set<string>();
    seen.add((await tokenSpaces(page)).join('|'));
    await page.getByTestId(TEST_IDS.acknowledgeCardButton).click();

    for (let sample = 0; sample < 60; sample += 1) {
      seen.add((await tokenSpaces(page)).join('|'));
      await page.waitForTimeout(40);
    }

    // Twenty spaces of travel cannot look like a jump.
    expect(seen.size).toBeGreaterThan(6);
    const after = await readPlayer(page, seeded.playerId);
    expect(after.position).toBe(0);
    expect(after.lastMove).toBe('forward');
    expect(after.cash).toBe(seeded.cash + 200);
  });

  test('walks a backward card backward, and pays nothing for it', async ({ page }) => {
    // Three back from 22 is 19, and the card must not pay a salary.
    const seeded = await seedDrawnCard(page, 22, { kind: 'move-steps', steps: -3 });

    await page.getByTestId(TEST_IDS.acknowledgeCardButton).click();
    await page.waitForTimeout(1200);

    const after = await readPlayer(page, seeded.playerId);
    expect(after.position).toBe(19);
    expect(after.lastMove).toBe('backward');
    expect(after.cash).toBe(seeded.cash);
  });

  /**
   * Jail from Chance at index 7 is the case that used to look like an ordinary
   * three-space roll. Backward, and the backward path runs straight past GO -
   * which must still pay nothing.
   */
  test('takes a token backward to Jail, past GO, unpaid', async ({ page }) => {
    const seeded = await seedDrawnCard(page, 7, { kind: 'go-to-jail' });

    await page.getByTestId(TEST_IDS.acknowledgeCardButton).click();
    await page.waitForTimeout(3200);

    const after = await readPlayer(page, seeded.playerId);
    expect(after.position).toBe(10);
    expect(after.lastMove).toBe('backward');
    expect(after.cash).toBe(seeded.cash);
  });

  // The doubles complaint: rolling on top of a walk still in progress.
  test('will not take another roll while a token is walking', async ({ page }) => {
    const rollButton = page.getByTestId(TEST_IDS.rollButton);

    await rollButton.click();
    // Mid-walk: the dice have committed and the token is on its way.
    await expect(rollButton).toBeDisabled();

    // And the walk finishes: something is offered again, whether that is the
    // extra roll, the end of the turn, or a decision the landing raised. One
    // `count` over all three, because isEnabled throws on a button the page has
    // not rendered - end turn is absent entirely while a decision is up.
    const settled = page.locator(
      [
        `[data-testid="${TEST_IDS.decisionModal}"]`,
        `[data-testid="${TEST_IDS.endTurnButton}"]:not([disabled])`,
        `[data-testid="${TEST_IDS.rollButton}"]:not([disabled])`,
      ].join(', ')
    );
    await expect(settled.first()).toBeVisible({ timeout: 8000 });
  });
});
