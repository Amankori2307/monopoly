import { expect, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';

/** Board indices of the four corner spaces, with their expected labels. */
export const CORNERS = [
  { index: 0, label: 'GO' },
  { index: 10, label: 'Jail / Just Visiting' },
  { index: 20, label: 'Free Parking' },
  { index: 30, label: 'Go To Jail' },
] as const;

/**
 * Creates a fresh game and waits for the board. Every spec starts here.
 *
 * `players` defaults to the form's own default of two. Pass MAX_PLAYERS to
 * exercise the crowded cases - a full table is where the sidebar and the token
 * cluster are under the most pressure.
 */
export const startGame = async (page: Page, options: { players?: number } = {}) => {
  await page.goto('/');

  if (options.players !== undefined) {
    await page.getByTestId(TEST_IDS.playerCountInput).fill(String(options.players));
  }

  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page).toHaveURL(/\/game\//);
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
};

/** What `advanceGame` did, so a caller can decide whether to keep going. */
export type GameAction =
  | 'rolled'
  | 'declined'
  | 'passed'
  | 'paid-fine'
  /** Took a free attempt at doubles from inside Jail. */
  | 'jail-rolled'
  | 'acknowledged-card'
  | 'ended-turn'
  /** A buy decision is up and the caller asked not to answer it. */
  | 'buy-available'
  | 'none';

/**
 * Performs whichever single action the game currently offers.
 *
 * Dice are real random, so tests that need a particular situation have to play
 * on until it appears. Centralising the "do the next thing" step keeps those
 * loops simple and stops each spec re-implementing it.
 */
interface AdvanceOptions {
  /** Pass false when the spec is testing the card modal itself. */
  acknowledgeCards?: boolean;
  /** Pass false to stop at a buy decision instead of declining it. */
  declineBuys?: boolean;
  /**
   * Pass true to buy the way out of Jail instead of rolling for it. The default
   * rolls, so the three free attempts stay on the path these specs walk.
   */
  payJailFine?: boolean;
}

const tryAdvance = async (page: Page, options: AdvanceOptions): Promise<GameAction> => {
  // First: a drawn card blocks everything until it is acknowledged, so a spec
  // that plays several turns must clear it or it deadlocks here.
  const acknowledgeCard = page.getByTestId(TEST_IDS.acknowledgeCardButton);
  if (await acknowledgeCard.isVisible()) {
    if (options.acknowledgeCards === false) {
      return 'none';
    }
    await acknowledgeCard.click();
    return 'acknowledged-card';
  }

  const decline = page.getByTestId(TEST_IDS.declineButton);
  if (await decline.isVisible()) {
    if (options.declineBuys === false) {
      return 'buy-available';
    }
    await decline.click();
    return 'declined';
  }

  const pass = page.getByRole('button', { name: 'Pass', exact: true });
  if (await pass.isVisible()) {
    await pass.click();
    return 'passed';
  }

  // Rolling for doubles comes BEFORE paying, deliberately. This helper used to
  // check the Pay button first, so every long-running spec paid its way out of
  // Jail and none ever rolled - which is how a jail panel with no roll button at
  // all went unnoticed. Free actions first keeps that path walked.
  const jailRoll = page.getByTestId(TEST_IDS.jailRollButton);
  if (await jailRoll.isVisible()) {
    if (options.payJailFine === true) {
      const payFineFirst = page.getByRole('button', { name: /^Pay \u20b9/ });
      if (await payFineFirst.isVisible()) {
        await payFineFirst.click();
        return 'paid-fine';
      }
    }
    await jailRoll.click();
    await page.waitForTimeout(120);
    return 'jail-rolled';
  }

  const payFine = page.getByRole('button', { name: /^Pay \u20b9/ });
  if (await payFine.isVisible()) {
    await payFine.click();
    return 'paid-fine';
  }

  const roll = page.getByTestId(TEST_IDS.rollButton);
  if (await roll.isEnabled()) {
    await roll.click();
    await page.waitForTimeout(700);
    return 'rolled';
  }

  const endTurn = page.getByTestId(TEST_IDS.endTurnButton);
  if (await endTurn.isVisible()) {
    await endTurn.click();
    return 'ended-turn';
  }

  return 'none';
};

export const advanceGame = async (
  page: Page,
  options: AdvanceOptions = {}
): Promise<GameAction> => {
  const action = await tryAdvance(page, options);
  if (action !== 'none') {
    return action;
  }

  // Decisions are deliberately withheld while a token walks to its space, so
  // "nothing to do" can mean "not yet". Wait for the DOM to offer something
  // rather than sleeping in fixed steps - a roll of twelve walks for over two
  // seconds, and blind polling made the suite an order of magnitude slower.
  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('button')).some((button) => {
          if ((button as HTMLButtonElement).disabled) {
            return false;
          }
          return /Roll dice|Roll for doubles|Done|Take extra roll|Buy for|Decline|^OK$|Pay |Use jail card|Submit bid|^Pass$/.test(
            button.textContent?.trim() ?? ''
          );
        }),
      undefined,
      { timeout: 6000 }
    );
  } catch {
    return 'none';
  }

  return tryAdvance(page, options);
};
