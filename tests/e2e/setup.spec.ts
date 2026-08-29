import { expect, test } from '@playwright/test';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

test('creates a game and navigates to a resumable route', async ({ page }) => {
  await startGame(page);

  await expect(page.getByRole('link', { name: 'Rules' })).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.playersPanel)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.turnControls)).toBeVisible();
});
