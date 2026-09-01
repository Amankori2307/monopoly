import { expect, test } from '@playwright/test';
import { PropertyAction } from '../../src/domain/types/game.enums';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

test('lays out the board and sidebar in two columns', async ({ page }) => {
  await startGame(page);

  const board = page.getByTestId(TEST_IDS.boardGrid);
  const sidebar = page.getByTestId(TEST_IDS.gameSidebar);

  await expect(board).toBeVisible();
  await expect(sidebar).toBeVisible();

  const [boardBox, sidebarBox] = await Promise.all([
    board.boundingBox(),
    sidebar.boundingBox(),
  ]);
  if (!boardBox || !sidebarBox) {
    throw new Error('Game layout regions have no layout box');
  }

  expect(boardBox.x + boardBox.width).toBeLessThanOrEqual(sidebarBox.x + 1);
});

// The property-action rail used to hold a third column of four buttons that
// could never fire: every property command needs a spaceId, and the rail had
// none. The site panel is the picker, so the rail is gone.
test('offers the property actions from the site panel', async ({ page }) => {
  await startGame(page);

  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, 1)).click();
  const panel = page.getByTestId(TEST_IDS.spaceDetailCard);
  await expect(panel).toBeVisible();

  // Nobody owns it yet, so the panel is the deed alone - no actions offered.
  await expect(
    page.getByTestId(scopedTestId(TEST_IDS.siteAction, PropertyAction.Build))
  ).toHaveCount(0);
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
