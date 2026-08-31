import { expect, test, type Page } from '@playwright/test';
import { scopedTestId, TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { PropertyAction } from '../../src/domain/types/game.enums';
import { advanceGame, startGame } from './helpers';

/** Which street to give to which seat, by index into the board's street list. */
interface OwnershipSeed {
  street: number;
  seat: number;
  mortgaged?: boolean;
}

/**
 * Assigns ownership in the saved game and reloads.
 *
 * Dice are real random, so a test that needs a particular board writes it
 * directly rather than playing until it happens to appear.
 */
const seedOwnership = async (page: Page, seeds: OwnershipSeed[]) => {
  const indices = await page.evaluate((ownership) => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const streets = game.board.filter((s: { kind: string }) => s.kind === 'street');

    ownership.forEach((seed) => {
      game.ownership[streets[seed.street].id] = {
        ownerPlayerId: game.playerOrder[seed.seat],
        mortgaged: Boolean(seed.mortgaged),
        buildLevel: 0,
      };
    });

    game.activePlayerIndex = 0;
    game.pendingDecision = { type: 'none' };
    game.turn = {
      phase: 'await_roll',
      doublesCount: 0,
      lastRoll: null,
      canRollAgain: false,
      reason: null,
    };
    localStorage.setItem(key, JSON.stringify(game));

    return streets.map((s: { index: number }) => s.index) as number[];
  }, seeds);

  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
  return indices;
};

test('reads every amount in rupees', async ({ page }) => {
  await page.goto('/');

  // The setup summary quotes the ruleset, so it is the earliest place to check.
  await expect(page.getByText(/Starting cash ₹1500/)).toBeVisible();

  await startGame(page);
  await expect(page.getByTestId(TEST_IDS.playersPanel)).toContainText('₹1500');
});

// Money used to move in silence: of twelve paths, seven logged nothing at all.
test('shows a toast for the action just taken', async ({ page }) => {
  await startGame(page);

  await page.getByTestId(TEST_IDS.rollButton).click();

  const toast = page.locator(`[data-testid^="${TEST_IDS.toast}-"]`).first();
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(/rolled/);
});

/**
 * Toasts used to sit bottom-right, which is where the dice and the end-turn
 * button live - a toast landed on top of them and swallowed the click that
 * rolled. Hit-testing the button's centre is the assertion that matters: it
 * fails whether the toast covers it or merely intercepts pointer events.
 */
test('never covers the dice or the end-turn button', async ({ page }) => {
  await startGame(page);

  // Several actions in quick succession, so the stack is at its tallest.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await advanceGame(page);
  }

  const toasts = page.locator(`[data-testid^="${TEST_IDS.toast}-"]`);
  await expect(toasts.first()).toBeVisible();

  const blocked = await page.evaluate(
    ([rollId, endTurnId, toastPrefix]) => {
      const controls = [rollId, endTurnId]
        .map((id) => document.querySelector(`[data-testid="${id}"]`))
        .filter((node): node is Element => node !== null);

      return controls.filter((control) => {
        const box = control.getBoundingClientRect();
        if (box.width === 0) {
          return false;
        }
        // Whatever sits at the control's centre is what a click would hit.
        const atCentre = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2
        );
        return Boolean(atCentre?.closest(`[data-testid^="${toastPrefix}-"]`));
      }).length;
    },
    [TEST_IDS.rollButton, TEST_IDS.endTurnButton, TEST_IDS.toast] as const
  );

  expect(blocked, 'a toast is intercepting clicks on a turn control').toBe(0);
});

test('dismisses a toast when it is clicked', async ({ page }) => {
  await startGame(page);

  await page.getByTestId(TEST_IDS.rollButton).click();
  const toast = page.locator(`[data-testid^="${TEST_IDS.toast}-"]`).first();
  await expect(toast).toBeVisible();

  await toast.click();

  await expect(toast).toHaveCount(0);
});

/**
 * The card is shown before it acts on the player.
 *
 * Seeded rather than played to: dice are real random, and this is about the
 * contract - the card is readable, and its effect lands only after OK. The
 * roll-to-draw path itself is covered deterministically in gameEngine.test.ts.
 */
test('shows a drawn card and applies it only on OK', async ({ page }) => {
  await startGame(page);

  const startingCash = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const playerId = game.playerOrder[game.activePlayerIndex];
    game.pendingDecision = {
      type: 'card-draw',
      playerId,
      deck: 'communityChest',
      card: {
        id: 'chest-bank-error',
        deck: 'community-chest',
        title: 'Bank error in your favor',
        description: 'Collect ₹200.',
        effect: { kind: 'collect', amount: 200 },
      },
    };
    game.turn = {
      phase: 'await_decision',
      doublesCount: 0,
      lastRoll: [3, 4],
      canRollAgain: false,
      reason: 'drew a card',
    };
    localStorage.setItem(key, JSON.stringify(game));
    return game.players[playerId].cash as number;
  });

  // The reload is load-bearing: it proves the card survived persistence, which
  // it only does because it rides inside pendingDecision.
  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();

  const modal = page.getByTestId(TEST_IDS.cardDrawDecision);
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Community Chest');
  await expect(modal).toContainText('Bank error in your favor');
  await expect(modal).toContainText('Collect ₹200.');
  // Nothing has happened yet, and rolling past it is not possible.
  await expect(page.getByTestId(TEST_IDS.rollButton)).toBeDisabled();
  await expect(page.getByTestId(TEST_IDS.playersPanel)).toContainText(`₹${startingCash}`);

  await page.getByTestId(TEST_IDS.acknowledgeCardButton).click();

  await expect(modal).toHaveCount(0);
  await expect(page.getByTestId(TEST_IDS.playersPanel)).toContainText(
    `₹${startingCash + 200}`
  );
});

/**
 * The draw is a new blocking decision, so it is a new way for a turn to stall.
 * Which square comes up is random, so this asserts that play progresses rather
 * than that a card appeared.
 */
test('keeps play moving across many turns, cards included', async ({ page }) => {
  // Every action waits out a real token walk, so a dozen of them is slower than
  // the default budget allows once the suite runs in parallel.
  test.setTimeout(60_000);
  await startGame(page);

  const turnNumber = () =>
    page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.startsWith('monopoly.game.')
      ) as string;
      return JSON.parse(localStorage.getItem(key) as string).turnNumber as number;
    });

  // A turn ends after two to four actions, so ten is ample to show progress.
  // Long-run play is covered by overlays.spec's forty-turn deadlock guard.
  const startingTurn = await turnNumber();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await advanceGame(page)) === 'none') {
      break;
    }
  }

  expect(await turnNumber(), 'play made no progress in 10 actions').toBeGreaterThan(
    startingTurn
  );
});

test('marks owned sites in the owner colour and hollows a mortgaged one', async ({
  page,
}) => {
  await startGame(page);
  await seedOwnership(page, [
    { street: 0, seat: 0 },
    { street: 1, seat: 0, mortgaged: true },
    { street: 2, seat: 1 },
  ]);

  const dots = page.locator(`[data-testid^="${TEST_IDS.spaceOwnerDot}-"]`);
  await expect(dots).toHaveCount(3);

  // Two owners, so two distinct colours - the mark has to say who, not just that.
  const colours = await dots.evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).backgroundColor)
  );
  expect(new Set(colours).size).toBeGreaterThan(1);

  await expect(dots.nth(1)).toHaveClass(/is-mortgaged/);
});

test('tells you where you stand on any site you click', async ({ page }) => {
  await startGame(page);
  const streetIndices = await seedOwnership(page, [
    { street: 0, seat: 0 },
    { street: 1, seat: 1 },
  ]);

  const openSpace = async (index: number) => {
    await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, index)).click();
    await expect(page.getByTestId(TEST_IDS.spaceDetailCard)).toBeVisible();
  };
  const close = () => page.getByRole('button', { name: 'Close space details' }).click();

  // Yours: your own actions, and no offer to yourself.
  await openSpace(streetIndices[0]);
  await expect(page.getByTestId(TEST_IDS.siteOwner)).toContainText('You own this site');
  await expect(
    page.getByTestId(`${TEST_IDS.siteAction}-${PropertyAction.Mortgage}`)
  ).toBeVisible();
  await expect(page.getByTestId(TEST_IDS.proposeTradeButton)).toHaveCount(0);
  await close();

  // Theirs: a named owner and a deal, no owner actions.
  await openSpace(streetIndices[1]);
  await expect(page.getByTestId(TEST_IDS.siteOwner)).toContainText('Owned by');
  await expect(page.getByTestId(TEST_IDS.proposeTradeButton)).toBeVisible();
  await close();

  // Unowned: the deed alone, nothing to act on.
  await openSpace(streetIndices[5]);
  await expect(page.getByTestId(TEST_IDS.siteActions)).toHaveCount(0);
});

test('shows a mortgaged site as mortgaged on its deed', async ({ page }) => {
  await startGame(page);
  const streetIndices = await seedOwnership(page, [
    { street: 0, seat: 0, mortgaged: true },
  ]);

  await page.getByTestId(scopedTestId(TEST_IDS.boardSpace, streetIndices[0])).click();

  await expect(page.getByTestId(TEST_IDS.deedMortgaged)).toBeVisible();
  // ...and on the player card, as a badge rather than appended text.
  await page.getByRole('button', { name: 'Close space details' }).click();
  await expect(
    page.getByTestId(`${TEST_IDS.playerBadge}-mortgaged`).first()
  ).toContainText('1 mortgaged');
});
