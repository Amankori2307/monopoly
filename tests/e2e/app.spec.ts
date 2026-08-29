import { expect, test } from '@playwright/test';

test('creates a game and navigates to a resumable route', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create game' }).click();

  await expect(page).toHaveURL(/\/game\//);
  await expect(page.getByTestId('board-grid')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rules' })).toBeVisible();

  await page.getByRole('button', { name: 'View details for Guwahati' }).click();
  await expect(page.getByRole('dialog', { name: 'Guwahati' })).toBeVisible();
  await expect(page.getByText('With whole colour set')).toBeVisible();
  await expect(page.getByText('Mortgage value')).toBeVisible();
});

// Corner spaces render one fewer child than street spaces (no colour bar). A row
// template that assumes the bar squeezes the corner title into it and clips the
// label, which is how the corners were previously misaligned.
test('renders every corner space square, aligned, and labelled', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page.getByTestId('board-grid')).toBeVisible();

  const corners = ['GO', 'Jail / Just Visiting', 'Free Parking', 'Go To Jail'];

  for (const name of corners) {
    // exact: 'View details for GO' is otherwise a substring of '...Go To Jail'.
    const corner = page.getByRole('button', {
      name: `View details for ${name}`,
      exact: true,
    });
    await expect(corner).toBeVisible();
    await expect(corner).toContainText(name);

    const box = await corner.boundingBox();
    expect(box).not.toBeNull();
    // Corner cells sit on the square 1.7fr track in both axes.
    expect(Math.abs(box!.width - box!.height)).toBeLessThanOrEqual(1);
  }

  // A corner must line up with its row neighbour rather than floating.
  const go = await page
    .getByRole('button', { name: 'View details for GO', exact: true })
    .boundingBox();
  const neighbour = await page
    .getByRole('button', { name: 'View details for Guwahati', exact: true })
    .boundingBox();
  expect(Math.abs((go!.y + go!.height) - (neighbour!.y + neighbour!.height))).toBeLessThanOrEqual(1);
});

test('applies the active theme to the board via data-theme', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page.getByTestId('board-grid')).toBeVisible();

  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'india-edition');

  // Street colours come from theme tokens, not inline styles.
  const swatch = page.locator('.space-color').first();
  await expect(swatch).toHaveAttribute('class', /group-/);
});
