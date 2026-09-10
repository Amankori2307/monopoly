import { expect, test } from '@playwright/test';
import { PropertyAction } from '../../src/domain/types/game.enums';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame, VIEWPORTS } from './helpers';
// Every assertion below is about the DESKTOP arrangement, so this spec pins the
// viewport rather than inheriting the config's default. Declarative rather than
// a call in each test: a test added later cannot forget it.
test.use({ viewport: VIEWPORTS.desktop });

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
// The claim is that the sidebar starts level with the board and its controls
// end at the bottom, with everything between them in order. The action rail is
// the column's first child now, so it is the rail that has to be level - the
// players sit directly under it.
test('pins the sidebar to the top and turn controls to the bottom', async ({ page }) => {
  await startGame(page);

  const [board, rail, players, controls] = await Promise.all([
    page.getByTestId(TEST_IDS.boardGrid).boundingBox(),
    page.getByTestId(TEST_IDS.actionRail).boundingBox(),
    page.getByTestId(TEST_IDS.playersPanel).boundingBox(),
    page.getByTestId(TEST_IDS.turnControls).boundingBox(),
  ]);
  if (!board || !rail || !players || !controls) {
    throw new Error('Layout regions have no bounding box');
  }

  expect(Math.abs(rail.y - board.y)).toBeLessThanOrEqual(4);
  expect(players.y).toBeGreaterThanOrEqual(rail.y + rail.height - 1);
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

// The colour is on a RAIL now, not on a border. It read `borderLeftColor`
// while the identity was a 5px `border-left`, which is the mechanism this
// change replaced: `is-active` set `border-color`, and `border-color` is all
// four sides, so the turn state was one declaration away from painting over
// whose card it was. Only an inline style stood between them.
test('tints each player card with its token colour', async ({ page }) => {
  await startGame(page);

  const colours = await page
    .locator('.player-card-strip')
    .evaluateAll((rails) => rails.map((rail) => getComputedStyle(rail).backgroundColor));

  expect(colours.length).toBeGreaterThan(1);
  // Distinct per player, and never the untinted default.
  expect(new Set(colours).size).toBe(colours.length);
  expect(colours).not.toContain('rgba(0, 0, 0, 0)');
});

// The player card, the trade deed and the jail card each drew their state as a
// ring in the accent. The board deleted that treatment first - `board-active-
// outline` came out of the theme contract and board.spec.ts fails on any
// accent ring - and nothing else was brought along, so the ACTIVE card was
// outlined in red while the player's own colour sat in the rail beside it
// saying something different. State is ground, weight and lift now.
test('says whose turn it is in that player own colour, not in the accent', async ({
  page,
}) => {
  await startGame(page);

  const active = page.locator('.player-card.is-active');
  await expect(active).toHaveCount(1);
  // The state reaches a screen reader too. It used to be a class and nothing
  // else, so whose turn it was existed only as paint.
  await expect(active).toHaveAttribute('aria-current', 'true');

  const marks = await active.evaluate((card) => {
    const style = getComputedStyle(card);
    const rail = card.querySelector('.player-card-strip');
    const resting = document.querySelector('.player-card:not(.is-active)');
    return {
      background: style.backgroundColor,
      borderColor: style.borderTopColor,
      outlineStyle: style.outlineStyle,
      shadow: style.boxShadow,
      railWidth: rail ? getComputedStyle(rail).width : '',
      restingBackground: resting ? getComputedStyle(resting).backgroundColor : '',
      restingRail: resting
        ? getComputedStyle(resting.querySelector('.player-card-strip')!).width
        : '',
    };
  });

  // No ring, in any of the three ways one can be drawn. The accent is
  // rgb(200, 65, 50) in the default palette and rgb(213, 63, 50) in aesthetic;
  // board.spec.ts pins the same two.
  const ACCENT = /rgb\(200, 65, 50\)|rgb\(213, 63, 50\)/;
  expect(marks.outlineStyle).toBe('none');
  expect(marks.borderColor).not.toMatch(ACCENT);
  expect(marks.shadow).not.toMatch(ACCENT);

  // Ground and weight instead, and both have to differ from a resting card or
  // the state is drawn by nothing at all.
  expect(marks.background).not.toBe(marks.restingBackground);
  expect(parseFloat(marks.railWidth)).toBeGreaterThan(parseFloat(marks.restingRail));
  // The lift. A resting card in the fan casts an upward tuck; this is the only
  // one that comes forward.
  expect(marks.shadow).not.toBe('none');
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
