import { expect, test, type Page } from '@playwright/test';
import { PropertyAction } from '../../src/domain/types/game.enums';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';

/** Board indices of the four corner spaces, with their expected labels. */
const CORNERS = [
  { index: 0, label: 'GO' },
  { index: 10, label: 'Jail / Just Visiting' },
  { index: 20, label: 'Free Parking' },
  { index: 30, label: 'Go To Jail' },
] as const;

const startGame = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page).toHaveURL(/\/game\//);
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
};

test('creates a game and navigates to a resumable route', async ({ page }) => {
  await startGame(page);

  await expect(page.getByRole('link', { name: 'Rules' })).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.turnPanel)).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.playersPanel)).toBeVisible();
});

test('shows a title deed with the street colour band and rent schedule', async ({
  page,
}) => {
  await startGame(page);

  // Delhi is dark blue - the band must carry the street's colour, not the panel's.
  await page.getByRole('button', { name: 'View details for Delhi', exact: true }).click();

  const card = page.getByTestId(TEST_IDS.spaceDetailCard);
  await expect(card).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.rentSchedule)).toBeVisible();

  const band = page.getByTestId(TEST_IDS.deedBand);
  await expect(band).toHaveClass(/group-dark-blue/);
  await expect(band).toHaveCSS('background-color', 'rgb(49, 80, 182)');
});

// Corner spaces render one fewer child than street spaces (no colour bar). A row
// template that assumes the bar squeezes the corner title into it and clips the
// label, which is how the corners were previously misaligned.
test('renders every corner space square, aligned, and labelled', async ({ page }) => {
  await startGame(page);

  for (const corner of CORNERS) {
    const cell = page.getByTestId(scopedTestId(TEST_IDS.boardSpace, corner.index));
    await expect(cell).toBeVisible();
    await expect(cell).toContainText(corner.label);

    const box = await cell.boundingBox();
    if (!box) {
      throw new Error(`Corner "${corner.label}" has no layout box`);
    }
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
  }

  // A corner must line up with its row neighbour rather than floating.
  const go = await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, 0)).boundingBox();
  const neighbour = await page
    .getByTestId(scopedTestId(TEST_IDS.boardSpace, 1))
    .boundingBox();
  if (!go || !neighbour) {
    throw new Error('GO or its row neighbour has no layout box');
  }
  expect(
    Math.abs(go.y + go.height - (neighbour.y + neighbour.height))
  ).toBeLessThanOrEqual(1);
});

test('lays out the action rail, board, and sidebar in three columns', async ({
  page,
}) => {
  await startGame(page);

  const rail = page.getByTestId(TEST_IDS.actionRail);
  const board = page.getByTestId(TEST_IDS.boardGrid);
  const sidebar = page.getByTestId(TEST_IDS.gameSidebar);

  await expect(rail).toBeVisible();
  await expect(sidebar).toBeVisible();

  const [railBox, boardBox, sidebarBox] = await Promise.all([
    rail.boundingBox(),
    board.boundingBox(),
    sidebar.boundingBox(),
  ]);
  if (!railBox || !boardBox || !sidebarBox) {
    throw new Error('Game layout regions have no layout box');
  }

  expect(railBox.x + railBox.width).toBeLessThanOrEqual(boardBox.x + 1);
  expect(boardBox.x + boardBox.width).toBeLessThanOrEqual(sidebarBox.x + 1);
});

test('offers the four property actions, disabled while scaffolded', async ({ page }) => {
  await startGame(page);

  for (const action of Object.values(PropertyAction)) {
    const button = page.getByTestId(scopedTestId(TEST_IDS.propertyActionButton, action));
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  }
});

// A theme token that is declared in SCSS but missing from the theme maps resolves
// to nothing, and `background: var(--missing)` computes to transparent. That is
// invisible to the type checker and to Sass, so assert the painted colour.
test('paints every action-rail button with its theme colour', async ({ page }) => {
  await startGame(page);

  for (const action of Object.values(PropertyAction)) {
    const button = page.getByTestId(scopedTestId(TEST_IDS.propertyActionButton, action));
    const background = await button.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    );

    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    expect(background).not.toBe('transparent');
  }
});

// Disabled buttons previously inherited the 0.45 reset opacity on top of a
// grayscale filter, which erased the rail entirely.
test('keeps disabled rail buttons legible', async ({ page }) => {
  await startGame(page);

  const opacity = await page
    .getByTestId(scopedTestId(TEST_IDS.propertyActionButton, PropertyAction.Build))
    .evaluate((element) => Number(getComputedStyle(element).opacity));

  expect(opacity).toBeGreaterThanOrEqual(0.6);
});

test('applies the active theme to the board via data-theme', async ({ page }) => {
  await startGame(page);

  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'india-edition');
  await expect(page.getByTestId(TEST_IDS.spaceColorBar).first()).toHaveClass(/group-/);
});

test('rolls the dice and advances the turn', async ({ page }) => {
  await startGame(page);

  await expect(page.getByTestId(TEST_IDS.diceDock)).toBeVisible();
  await expect(page.getByTestId(scopedTestId(TEST_IDS.dieFace, 0))).toBeVisible();

  await page.getByTestId(TEST_IDS.rollButton).click();

  // The roll animation commits to the engine, which then logs the roll.
  await expect(page.getByTestId(TEST_IDS.activityPanel)).toContainText('rolled');
});
