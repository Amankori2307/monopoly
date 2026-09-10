import { expect, test, type Page } from '@playwright/test';
import { PropertyAction } from '../../src/domain/types/game.enums';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame, VIEWPORTS } from './helpers';

/**
 * Build, Sell, Mortgage, Redeem, Trade - under the board, always there.
 *
 * A rail like this existed once and was removed, for a reason recorded in
 * pages/_game.scss: "every action it listed needs a spaceId, and the site
 * panel is where one exists". These drive the answer to that: the rail offers
 * the action, and a picker sheet supplies the site.
 */

const railButton = (page: Page, action: PropertyAction | 'trade') =>
  page.getByTestId(`${TEST_IDS.actionRailButton}-${action}`);

/** Gives the active player a whole colour set, and the cash to build on it. */
const seedCompleteSet = async (page: Page) => {
  const seeded = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const owner = game.playerOrder[0];
    const group = game.board.find(
      (space: { kind: string }) => space.kind === 'street'
    ).colorGroup;
    const sites = game.board.filter(
      (space: { kind: string; colorGroup?: string }) =>
        space.kind === 'street' && space.colorGroup === group
    );

    sites.forEach((site: { id: string }) => {
      game.ownership[site.id] = {
        ownerPlayerId: owner,
        mortgaged: false,
        buildLevel: 0,
      };
    });
    game.players[owner].cash = 5000;
    game.activePlayerIndex = 0;
    game.turn = {
      phase: 'turn_complete',
      doublesCount: 0,
      lastRoll: [3, 4],
      canRollAgain: false,
      reason: 'done',
      speedDieFace: null,
      pendingMonopolyAdvance: false,
      lastRollId: null,
    };
    localStorage.setItem(key, JSON.stringify(game));

    return {
      names: sites.map((site: { name: string }) => site.name as string),
      houseCost: sites[0].houseCost as number,
    };
  });

  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
  return seeded;
};

test.describe('the action rail', () => {
  test.use({ viewport: VIEWPORTS.android });

  /**
   * The row never changes shape. A player glancing down should find Mortgage
   * in the same place every turn, whether or not they can use it - which is
   * why the buttons are disabled rather than removed.
   */
  test('always offers the same five, and says why a dead one is dead', async ({
    page,
  }) => {
    await startGame(page);

    const actions = [
      PropertyAction.Build,
      PropertyAction.Sell,
      PropertyAction.Mortgage,
      PropertyAction.Redeem,
      'trade' as const,
    ];
    for (const action of actions) {
      await expect(railButton(page, action)).toBeVisible();
    }

    // Owning nothing, all four property actions are refused - and each says so
    // in the shape every other refusal in the game uses: a fragment, capital
    // initial, no terminal stop. See docs/conventions.md section 3d.
    for (const action of actions.slice(0, 4)) {
      const button = railButton(page, action);
      await expect(button).toBeDisabled();
      const reason = await button.getAttribute('title');
      expect(reason, `${action} reason`).toBe('You do not own anything yet');
    }
  });

  test('opens a picker listing only what the command will take', async ({ page }) => {
    await startGame(page);
    const { names, houseCost } = await seedCompleteSet(page);

    await expect(railButton(page, PropertyAction.Build)).toBeEnabled();
    await railButton(page, PropertyAction.Build).click();

    const sheet = page.getByTestId(TEST_IDS.actionPicker);
    await expect(sheet).toBeVisible();

    // Exactly the sites of the completed set, each with what a house costs on
    // it - which is half of why the list exists.
    const rows = sheet.locator('.site-choice-list li');
    await expect(rows).toHaveCount(names.length);
    for (const name of names) {
      await expect(sheet.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(sheet.getByText(`₹${houseCost}`).first()).toBeVisible();
  });

  test('runs the command on the site that was picked, and closes', async ({ page }) => {
    await startGame(page);
    await seedCompleteSet(page);

    await railButton(page, PropertyAction.Build).click();
    const sheet = page.getByTestId(TEST_IDS.actionPicker);
    await sheet.locator('.site-choice-list button').first().click();

    await expect(sheet).toBeHidden();
    // A house is on the board, which is the only proof that matters.
    await expect(page.locator('.space-buildings').first()).toBeVisible();
  });

  /**
   * Trade needs somebody to trade WITH, not one of your own squares - so with
   * exactly one solvent opponent there is no question to ask, and the builder
   * opens straight away. That is the two-player game, which is most of them.
   */
  test('goes straight to the builder when there is one opponent', async ({ page }) => {
    await startGame(page);
    await seedCompleteSet(page);

    await railButton(page, 'trade').click();

    await expect(page.getByTestId(TEST_IDS.actionPicker)).toBeHidden();
    await expect(page.locator('.trade-modal')).toBeVisible();
  });

  test('asks who first when there is more than one', async ({ page }) => {
    await startGame(page, { players: 4 });
    await seedCompleteSet(page);

    await railButton(page, 'trade').click();

    const sheet = page.getByTestId(TEST_IDS.actionPicker);
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.site-choice-list li')).toHaveCount(3);

    await sheet.locator('.site-choice-list button').first().click();
    await expect(page.locator('.trade-modal')).toBeVisible();
  });

  test('clears the tap floor, and never scrolls the page sideways', async ({ page }) => {
    await startGame(page);
    await seedCompleteSet(page);

    const short = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.action-rail button'))
        .map((button) => button.getBoundingClientRect())
        .filter((box) => box.width < 44 || box.height < 44)
        .map((box) => `${Math.round(box.width)}x${Math.round(box.height)}`)
    );
    expect(short).toEqual([]);

    await railButton(page, PropertyAction.Mortgage).click();
    await expect(page.getByTestId(TEST_IDS.actionPicker)).toBeVisible();

    const overflow = await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth - window.innerWidth,
      vertical: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(overflow).toEqual({ horizontal: 0, vertical: 0 });

    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.site-choice-list button'))
        .map((button) => button.getBoundingClientRect().height)
        .filter((height) => height < 44)
    );
    expect(rows).toEqual([]);
  });
});

test.describe('the action rail on a desktop', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('sits at the top of the sidebar and opens a side drawer', async ({ page }) => {
    await startGame(page);
    await seedCompleteSet(page);

    await railButton(page, PropertyAction.Mortgage).click();

    const sheet = page.getByTestId(TEST_IDS.actionPicker);
    await expect(sheet).toBeVisible();
    // A drawer, not a bottom sheet: the phone treatment is a phone treatment.
    const box = await sheet.boundingBox();
    expect(box?.width ?? 0).toBeLessThan(VIEWPORTS.desktop.width / 2);
  });
});
