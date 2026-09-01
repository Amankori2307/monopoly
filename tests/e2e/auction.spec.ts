import { expect, test, type Page } from '@playwright/test';
import { AUCTION_START_PRICE } from '../../src/domain/constants/game.constants';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';
import { startGame } from './helpers';

/**
 * The auction panel: the deed, the running ledger, and a bid field that arrives
 * legal.
 *
 * Driven through the UI a player actually uses. The auction is seeded rather
 * than played into, because reaching one by rolling means waiting on real dice
 * to land somebody on an unowned site with the decline still available.
 */

/** Puts the active player on an unowned street with the buy decision pending. */
const seedLandedOnUnowned = async (page: Page) => {
  const seeded = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('monopoly.game.')
    ) as string;
    const game = JSON.parse(localStorage.getItem(key) as string);
    const street = game.board.find((space: { kind: string }) => space.kind === 'street');
    const activePlayerId = game.playerOrder[game.activePlayerIndex];

    game.players[activePlayerId].position = street.index;
    game.pendingDecision = {
      type: 'landed-unowned-property',
      spaceId: street.id,
      playerId: activePlayerId,
    };
    game.turn = {
      phase: 'await_decision',
      doublesCount: 0,
      lastRoll: [3, 4],
      canRollAgain: false,
      reason: 'Decide on the site',
      speedDieFace: null,
      pendingMonopolyAdvance: false,
    };
    localStorage.setItem(key, JSON.stringify(game));

    return {
      name: street.name as string,
      names: game.playerOrder.map((id: string) => game.players[id].name as string),
    };
  });

  await page.reload();
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
  return seeded;
};

/** Declines the landed site, which is what sends it to auction. */
const openAuction = async (page: Page) => {
  const seeded = await seedLandedOnUnowned(page);
  await page.getByTestId(TEST_IDS.declineButton).click();
  await expect(page.getByTestId(TEST_IDS.auctionDecision)).toBeVisible();
  return seeded;
};

const logLines = (page: Page) =>
  page.getByTestId(TEST_IDS.auctionLogLine).allTextContents();

test.describe('the auction panel', () => {
  test.beforeEach(async ({ page }) => {
    await startGame(page, { players: 3 });
  });

  test('shows the deed for the site under the hammer', async ({ page }) => {
    const seeded = await openAuction(page);
    const panel = page.getByTestId(TEST_IDS.auctionDecision);

    // The deed, not a name in a sentence: the modal covers the board, so this
    // is the only way to see what a bid is worth.
    await expect(panel.getByTestId(TEST_IDS.spaceCard)).toBeVisible();
    // Named once, by the card: the right-hand column carries no heading.
    await expect(panel).toContainText(seeded.name);
    await expect(panel).toContainText('Rent');
  });

  // Whose turn it is is said by the log's own last line, and nowhere else.
  test('ends the log on whoever is being asked to bid', async ({ page }) => {
    const seeded = await openAuction(page);

    await expect(page.getByTestId(TEST_IDS.auctionActiveBidder)).toContainText(
      new RegExp(`${seeded.names[0]}|${seeded.names[1]}|${seeded.names[2]}`)
    );
    await expect(page.getByTestId(TEST_IDS.auctionActiveBidder)).toContainText('bidding');
  });

  test('opens the ledger on the start price', async ({ page }) => {
    await openAuction(page);

    expect(await logLines(page)).toEqual([
      expect.stringContaining(`Auction started at ₹${AUCTION_START_PRICE}`),
    ]);
  });

  /**
   * The bug this panel was rebuilt around: the field held ₹10 for ever, so once
   * the high bid was past that, Submit threw and the player had to guess a legal
   * number from the error message.
   */
  test('keeps the bid field on the minimum legal bid as the bidding rises', async ({
    page,
  }) => {
    await openAuction(page);
    const bidInput = page.getByTestId(TEST_IDS.bidInput);

    await expect(bidInput).toHaveValue(String(AUCTION_START_PRICE));

    await page.getByTestId(TEST_IDS.submitBidButton).click();
    // The next bidder is asked, and the field has moved up with the auction.
    await expect(bidInput).toHaveValue(String(AUCTION_START_PRICE + 1));

    await page.getByTestId(TEST_IDS.submitBidButton).click();
    await expect(bidInput).toHaveValue(String(AUCTION_START_PRICE + 2));
  });

  test('records each bid and pass in order, against the player who made it', async ({
    page,
  }) => {
    await openAuction(page);
    const firstBidder = await page
      .getByTestId(TEST_IDS.auctionActiveBidder)
      .textContent();

    await page.getByTestId(TEST_IDS.bidInput).fill('20');
    await page.getByTestId(TEST_IDS.submitBidButton).click();
    await page.getByTestId(TEST_IDS.passAuctionButton).click();

    const lines = await logLines(page);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('₹20');
    // The first line after the opening belongs to whoever was asked first.
    expect(firstBidder).toContain(
      lines[1]
        .replace(/[^A-Za-z ]/g, '')
        .split(' bid')[0]
        .trim()
    );
    expect(lines[2]).toContain('passed');
  });

  test('records a pass in the log', async ({ page }) => {
    await openAuction(page);

    await page.getByTestId(TEST_IDS.passAuctionButton).click();

    // Not a chip that greys out - the log simply says they passed.
    expect(await logLines(page)).toEqual([
      expect.stringContaining('Auction started'),
      expect.stringContaining('passed'),
    ]);
  });

  test('raises the field by the chip that was tapped', async ({ page }) => {
    await openAuction(page);
    const bidInput = page.getByTestId(TEST_IDS.bidInput);

    await page.getByTestId(TEST_IDS.auctionRaise).nth(1).click();

    await expect(bidInput).toHaveValue(String(AUCTION_START_PRICE + 50));
  });

  test('bids everything the player holds on all in', async ({ page }) => {
    await openAuction(page);

    await page.getByTestId(TEST_IDS.auctionAllIn).click();

    // Starting cash, which is every rupee they have.
    await expect(page.getByTestId(TEST_IDS.bidInput)).toHaveValue('1500');
  });

  /**
   * The panel refuses an illegal bid itself, with the reason stated - it used to
   * let the engine throw and show the player an error banner.
   */
  test('refuses an illegal bid rather than letting the engine throw', async ({
    page,
  }) => {
    await openAuction(page);
    const submit = page.getByTestId(TEST_IDS.submitBidButton);

    await page.getByTestId(TEST_IDS.bidInput).fill('2');

    await expect(submit).toBeDisabled();
    await expect(page.getByTestId(TEST_IDS.auctionBidBlocked)).toContainText(
      `at least ${AUCTION_START_PRICE}`
    );
    // Passing is still open to them, so the auction cannot stall.
    await expect(page.getByTestId(TEST_IDS.passAuctionButton)).toBeEnabled();
    await expect(page.getByTestId(TEST_IDS.commandError)).toBeHidden();
  });

  test('refuses a bid past the bidder’s cash', async ({ page }) => {
    await openAuction(page);

    await page.getByTestId(TEST_IDS.bidInput).fill('99999');

    await expect(page.getByTestId(TEST_IDS.submitBidButton)).toBeDisabled();
    await expect(page.getByTestId(TEST_IDS.auctionBidBlocked)).toContainText(
      /available cash/i
    );
  });

  // The panel closes on the win, and the toast is where the result is said.
  test('closes on the win, and says who took it', async ({ page }) => {
    const seeded = await openAuction(page);

    await page.getByTestId(TEST_IDS.bidInput).fill('40');
    await page.getByTestId(TEST_IDS.submitBidButton).click();
    await page.getByTestId(TEST_IDS.passAuctionButton).click();
    await page.getByTestId(TEST_IDS.passAuctionButton).click();

    await expect(page.getByTestId(TEST_IDS.auctionDecision)).toBeHidden();
    await expect(
      page.locator(`[data-testid^="${TEST_IDS.toast}-"]`).filter({
        hasText: new RegExp(`won the auction for ${seeded.name}`, 'i'),
      })
    ).toBeVisible();
  });

  // A save written mid-auction has to come back with its bidding intact.
  test('keeps the bidding across a reload', async ({ page }) => {
    await openAuction(page);
    await page.getByTestId(TEST_IDS.bidInput).fill('75');
    await page.getByTestId(TEST_IDS.submitBidButton).click();

    await page.reload();
    await expect(page.getByTestId(TEST_IDS.auctionDecision)).toBeVisible();

    const lines = await logLines(page);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('₹75');
  });

  test('collapses to one column on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await openAuction(page);

    const panel = page.getByTestId(TEST_IDS.auctionDecision);
    await expect(panel).toBeVisible();
    // One column, and nothing spilling sideways out of the page.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
