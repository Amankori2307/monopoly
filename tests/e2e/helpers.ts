import { expect, type Page } from '@playwright/test';
import { DICE_ROLL_DURATION_MS } from '../../src/components/game/diceDock.constants';
import { TEST_IDS } from '../../src/shared/constants/testIds.constants';

/**
 * Viewports the layout is designed against.
 *
 * These are named and exported rather than written inline, because the specs
 * now come in two kinds and each has to say which it is. The desktop geometry
 * suites - layout.spec.ts, full-table.spec.ts - used to rely on Playwright's
 * implicit default, so "this asserts the DESKTOP layout" was nowhere in the
 * code: the moment a phone layout existed, those assertions were one config
 * edit away from silently testing the wrong thing.
 */
export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  /** iPhone-class portrait, the narrowest phone still worth supporting. */
  phone: { width: 375, height: 812 },
  /** The smallest viewport the reset admits (`body { min-width: 320px }`). */
  phoneSmall: { width: 320, height: 568 },
  /**
   * The commonest small Android frame, and the tightest window the game has to
   * work in for real: 360 CSS px is what almost every Android phone reports,
   * and 640 is the short end of the range still in the field. It is narrower
   * AND shorter than `phone`, so it is the frame that decides whether a
   * decision modal fits.
   */
  android: { width: 360, height: 640 },
  /** The same phone turned sideways: wide, and very short. */
  phoneLandscape: { width: 812, height: 375 },
} as const;

/** Board indices of the four corner spaces, with their expected labels. */
export const CORNERS = [
  { index: 0, label: 'GO' },
  { index: 10, label: 'Jail / Just Visiting' },
  { index: 20, label: 'Free Parking' },
  { index: 30, label: 'Go To Jail' },
] as const;

/**
 * Creates a fresh game and waits for the board. Every spec starts here.
 *
 * `players` defaults to the form's own default of two. Pass MAX_PLAYERS to
 * exercise the crowded cases - a full table is where the sidebar and the token
 * cluster are under the most pressure.
 */
export const startGame = async (
  page: Page,
  options: { players?: number; edition?: string } = {}
) => {
  // Straight to the setup screen, not through the chooser. `/` is a chooser
  // now, and going via a click would make ~150 tests depend on the front
  // door's copy for no gain - the tests that are ABOUT the front door use
  // openChooser instead. Safe as the first navigation in a test, which is a
  // real document load rather than a hash-only change.
  await page.goto('/#/new');

  if (options.players !== undefined) {
    await page.getByTestId(TEST_IDS.playerCountInput).fill(String(options.players));
  }

  // The edition decides the forty names, and a name's LENGTH is a layout fact:
  // India's longest street is "Bhubaneshwar" and the US board's is
  // "North Carolina Avenue", which is what makes the deed card's tallest case
  // reachable at all. A spec that only ever plays the default board cannot see
  // it.
  if (options.edition !== undefined) {
    await page.getByLabel('Ruleset').selectOption({ label: options.edition });
  }

  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page).toHaveURL(/\/game\//);
  await expect(page.getByTestId(TEST_IDS.boardGrid)).toBeVisible();
};

/** The front door itself, for the tests that are about it. */
export const openChooser = (page: Page) => page.goto('/');

/** What `advanceGame` did, so a caller can decide whether to keep going. */
export type GameAction =
  | 'rolled'
  | 'declined'
  | 'passed'
  | 'paid-fine'
  /** Took a free attempt at doubles from inside Jail. */
  | 'jail-rolled'
  | 'acknowledged-card'
  | 'ended-turn'
  /** A buy decision is up and the caller asked not to answer it. */
  | 'buy-available'
  | 'none';

/**
 * Performs whichever single action the game currently offers.
 *
 * Dice are real random, so tests that need a particular situation have to play
 * on until it appears. Centralising the "do the next thing" step keeps those
 * loops simple and stops each spec re-implementing it.
 */
interface AdvanceOptions {
  /** Pass false when the spec is testing the card modal itself. */
  acknowledgeCards?: boolean;
  /** Pass false to stop at a buy decision instead of declining it. */
  declineBuys?: boolean;
  /**
   * Pass true to buy the way out of Jail instead of rolling for it. The default
   * rolls, so the three free attempts stay on the path these specs walk.
   */
  payJailFine?: boolean;
}

const tryAdvance = async (page: Page, options: AdvanceOptions): Promise<GameAction> => {
  // First: a drawn card blocks everything until it is acknowledged, so a spec
  // that plays several turns must clear it or it deadlocks here.
  const acknowledgeCard = page.getByTestId(TEST_IDS.acknowledgeCardButton);
  if (await acknowledgeCard.isVisible()) {
    if (options.acknowledgeCards === false) {
      return 'none';
    }
    await acknowledgeCard.click();
    return 'acknowledged-card';
  }

  const decline = page.getByTestId(TEST_IDS.declineButton);
  if (await decline.isVisible()) {
    if (options.declineBuys === false) {
      return 'buy-available';
    }
    await decline.click();
    return 'declined';
  }

  const pass = page.getByRole('button', { name: 'Pass', exact: true });
  if (await pass.isVisible()) {
    await pass.click();
    return 'passed';
  }

  // Rolling for doubles comes BEFORE paying, deliberately. This helper used to
  // check the Pay button first, so every long-running spec paid its way out of
  // Jail and none ever rolled - which is how a jail panel with no roll button at
  // all went unnoticed. Free actions first keeps that path walked.
  const jailRoll = page.getByTestId(TEST_IDS.jailRollButton);
  if (await jailRoll.isVisible()) {
    if (options.payJailFine === true) {
      const payFineFirst = page.getByRole('button', { name: /^Pay \u20b9/ });
      if (await payFineFirst.isVisible()) {
        await payFineFirst.click();
        return 'paid-fine';
      }
    }
    await jailRoll.click();
    // The Jail roll tumbles before it commits, the same as every other roll -
    // 120ms was enough when it dispatched straight out and is not now.
    await page.waitForTimeout(DICE_ROLL_DURATION_MS + 150);
    return 'jail-rolled';
  }

  const payFine = page.getByRole('button', { name: /^Pay \u20b9/ });
  if (await payFine.isVisible()) {
    await payFine.click();
    return 'paid-fine';
  }

  const roll = page.getByTestId(TEST_IDS.rollButton);
  if (await roll.isEnabled()) {
    await roll.click();
    await page.waitForTimeout(700);
    return 'rolled';
  }

  const endTurn = page.getByTestId(TEST_IDS.endTurnButton);
  if (await endTurn.isVisible()) {
    await endTurn.click();
    return 'ended-turn';
  }

  return 'none';
};

export const advanceGame = async (
  page: Page,
  options: AdvanceOptions = {}
): Promise<GameAction> => {
  const action = await tryAdvance(page, options);
  if (action !== 'none') {
    return action;
  }

  // Decisions are deliberately withheld while a token walks to its space, so
  // "nothing to do" can mean "not yet". Wait for the DOM to offer something
  // rather than sleeping in fixed steps - a roll of twelve walks for over two
  // seconds, and blind polling made the suite an order of magnitude slower.
  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('button')).some((button) => {
          if ((button as HTMLButtonElement).disabled) {
            return false;
          }
          return /Roll dice|Roll for doubles|End turn|Take extra roll|Buy for|Decline|^Continue$|Pay |Use jail card|Submit bid|^Pass$/.test(
            button.textContent?.trim() ?? ''
          );
        }),
      undefined,
      { timeout: 6000 }
    );
  } catch {
    return 'none';
  }

  return tryAdvance(page, options);
};

/**
 * A theme token's value, as the browser will have computed it.
 *
 * Assertions compare against this rather than against a literal `rgb(...)`. The
 * intent is almost always "this element carries that token", and a literal
 * cannot tell the difference between a palette change and the element quietly
 * stopping to track its token - it fails on the first and passes the second.
 */
export const tokenColor = async (page: Page, token: string): Promise<string> => {
  const hex = await page.evaluate(
    (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    token
  );
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const int = parseInt(full, 16);
  return `rgb(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255})`;
};

/**
 * Every element whose corners are not square, ignoring the physical pieces.
 *
 * The design system is deliberately sharp, and the guarantee is whole-DOM: any
 * rounded surface anywhere is a failure. Shared because the scan has to run on
 * more than one board state - it passed for a long time only because a fresh
 * game has no buildings on it, so the pieces were never in the DOM to measure.
 *
 * A pawn, a die and its pips are the documented exception: real objects rather
 * than UI surfaces. A trade column's owner dot belongs with them - it is a player's token
 * drawn small, takes its colour from the same theme data, and reuses the very
 * same $token-radius. It went unlisted only because it needs an owned site to
 * exist, and a fresh game has none.
 *
 * Houses and hotels need no entry, because an SVG's own geometry is not a
 * border-radius.
 */
export const findRoundedElements = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const physicalPieces = [
      'token-chip',
      'die-face',
      'pip',
      // The board's owner mark is a square-ended BAR now, not a dot, so it no
      // longer needs an exception here - one fewer thing exempt from the
      // sharp-corner rule.
      // A trade column's owner dot: a physical piece, so the same exception the
      // board's dot used to take. It escaped notice because no trade modal is
      // open when this sweep runs - the identical vacuity buildings.spec.ts was
      // written for.
      'trade-column-dot',
    ];
    return Array.from(document.querySelectorAll('body *'))
      .filter(
        (element) => !physicalPieces.some((name) => element.classList.contains(name))
      )
      .filter((element) => {
        const radius = getComputedStyle(element).borderRadius;
        return radius !== '' && radius !== '0px';
      })
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`)
      .slice(0, 10);
  });
