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
