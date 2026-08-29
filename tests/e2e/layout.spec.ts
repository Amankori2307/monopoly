import { expect, test } from '@playwright/test';
import { PropertyAction } from '../../src/domain/types/game.enums';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

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

// The dice previously floated bottom-right on a white panel with a blur. They
// now sit in the flow beside the board with no chrome of their own.
test('docks the dice beside the board with no panel background', async ({ page }) => {
  await startGame(page);

  const dice = page.getByTestId(TEST_IDS.diceDock);
  const board = page.getByTestId(TEST_IDS.boardGrid);
  await expect(dice).toBeVisible();

  const [diceBox, boardBox] = await Promise.all([
    dice.boundingBox(),
    board.boundingBox(),
  ]);
  if (!diceBox || !boardBox) {
    throw new Error('Dice or board has no layout box');
  }

  // Clear of the board's right edge and down at its lower end, per the reference.
  expect(diceBox.x).toBeGreaterThanOrEqual(boardBox.x + boardBox.width - 1);
  expect(diceBox.y).toBeGreaterThan(boardBox.y + boardBox.height / 2);

  const chrome = await dice.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      position: style.position,
      background: style.backgroundColor,
      boxShadow: style.boxShadow,
      backdropFilter: style.backdropFilter,
    };
  });
  expect(chrome.position).toBe('static');
  expect(chrome.background).toBe('rgba(0, 0, 0, 0)');
  expect(chrome.boxShadow).toBe('none');
  expect(chrome.backdropFilter).toBe('none');
});

// Players sit at the top of the sidebar and the turn controls at the bottom,
// with only the middle scrolling - mirroring the reference layout.
test('pins players to the top and turn controls to the bottom', async ({ page }) => {
  await startGame(page);

  const [board, players, controls] = await Promise.all([
    page.getByTestId(TEST_IDS.boardGrid).boundingBox(),
    page.getByTestId(TEST_IDS.playersPanel).boundingBox(),
    page.getByTestId(TEST_IDS.turnControls).boundingBox(),
  ]);
  if (!board || !players || !controls) {
    throw new Error('Layout regions have no bounding box');
  }

  expect(Math.abs(players.y - board.y)).toBeLessThanOrEqual(4);
  expect(controls.y).toBeGreaterThan(players.y + players.height);
  expect(players.x).toBeGreaterThanOrEqual(board.x + board.width - 1);
});

// The dice must stay put while the panels beside them scroll.
test('keeps the dice pinned while the sidebar scrolls', async ({ page }) => {
  await startGame(page);

  const dice = page.getByTestId(TEST_IDS.diceDock);
  const before = await dice.boundingBox();

  await page.getByTestId(TEST_IDS.gameSidebar).evaluate((sidebar) => {
    const scroller = sidebar.querySelector('.game-side-scroll');
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  });

  const after = await dice.boundingBox();
  if (!before || !after) {
    throw new Error('Dice has no layout box');
  }
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
});

test('tints each player card with its token colour', async ({ page }) => {
  await startGame(page);

  const colours = await page
    .getByTestId(/^player-card-/)
    .evaluateAll((cards) => cards.map((card) => getComputedStyle(card).borderLeftColor));

  expect(colours.length).toBeGreaterThan(1);
  // Distinct per player, and never the untinted default.
  expect(new Set(colours).size).toBe(colours.length);
});

test('shows players as a stack that expands into a list', async ({ page }) => {
  await startGame(page);

  const stack = page.getByTestId(TEST_IDS.playerStack);
  await expect(stack).toHaveClass(/is-collapsed/);

  const cards = page.getByTestId(/^player-card-/);
  const [topBefore, behindBefore] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  if (!topBefore || !behindBefore) {
    throw new Error('Player cards have no layout box');
  }
  // Collapsed, the card behind is clipped to a peek.
  expect(behindBefore.height).toBeLessThan(topBefore.height / 2);

  await page.getByTestId(TEST_IDS.playerStackExpand).click();
  await expect(stack).toHaveClass(/is-expanded/);

  // Expanded, both cards show at full height.
  await expect
    .poll(async () => {
      const box = await cards.nth(1).boundingBox();
      return box ? Math.round(box.height) : 0;
    })
    .toBeGreaterThan(topBefore.height / 2);
});
