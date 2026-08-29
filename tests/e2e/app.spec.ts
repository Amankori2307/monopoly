import { expect, test } from '@playwright/test';

test('creates a game and navigates to a resumable route', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create game' }).click();

  await expect(page).toHaveURL(/\/game\//);
  await expect(page.getByTestId('board-grid')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rules' })).toBeVisible();
});
