import { expect, type Page } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';

/** Board indices of the four corner spaces, with their expected labels. */
export const CORNERS = [
  { index: 0, label: 'GO' },
  { index: 10, label: 'Jail / Just Visiting' },
  { index: 20, label: 'Free Parking' },
  { index: 30, label: 'Go To Jail' },
] as const;

/** Creates a fresh game and waits for the board. Every spec starts here. */
export const startGame = async (page: Page) => {
  await page.goto('/');
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
  | 'ended-turn'
  | 'none';

/**
 * Performs whichever single action the game currently offers.
 *
 * Dice are real random, so tests that need a particular situation have to play
 * on until it appears. Centralising the "do the next thing" step keeps those
 * loops simple and stops each spec re-implementing it.
 */
export const advanceGame = async (page: Page): Promise<GameAction> => {
  const decline = page.getByTestId(TEST_IDS.declineButton);
  if (await decline.isVisible()) {
    await decline.click();
    return 'declined';
  }

  const pass = page.getByRole('button', { name: 'Pass', exact: true });
  if (await pass.isVisible()) {
    await pass.click();
    return 'passed';
  }

  const payFine = page.getByRole('button', { name: /^Pay M/ });
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
