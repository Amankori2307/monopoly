import { GameCommandType, PropertyAction } from '../types/game.enums';
import type { GameState, PlayerId, RuntimeGameCommand } from '../types/game.interfaces';
import type { EligibleSite } from '../rules/playerActions.interfaces';
import { getLiquidationValue } from '../rules/buildings.utils';
import { getPlayerActionOptions } from '../rules/playerActions.utils';
import { BOT_CASH_RESERVE } from './bot.constants';

/**
 * Answering a liquidation, and spending a float that is not needed.
 *
 * Every option here comes from `getPlayerActionOptions`, which is built from
 * `getSiteActions`, which is the engine's own rules. Not one of them is
 * restated: a command this module returns is a command that will succeed, which
 * is the same guarantee the action rail gives a person. A bot that guessed
 * would throw out of the engine and, because a throw in the turn driver reaches
 * nothing but `ErrorBoundary`, take the whole page down.
 */

/** The legal sites for one action right now, or an empty list. */
const sitesFor = (
  state: GameState,
  playerId: PlayerId,
  action: PropertyAction
): EligibleSite[] =>
  getPlayerActionOptions(state, playerId).find((option) => option.action === action)
    ?.sites ?? [];

/**
 * The site to raise cash from: the smallest one that covers the shortfall, or
 * the biggest one when none does.
 *
 * Smallest-that-covers rather than biggest-first, because everything sold or
 * mortgaged is rent this player stops collecting - so the aim is to clear the
 * debt in as few squares as possible, and then to stop. Biggest-when-none-does
 * is the other half of the same idea: if no single square is enough, the fewest
 * steps to solvency is the largest one each time.
 */
export const siteToLiquidate = (
  sites: EligibleSite[],
  shortfall: number
): EligibleSite | null => {
  if (sites.length === 0) {
    return null;
  }
  const covering = sites
    .filter((site) => site.amount >= shortfall)
    .sort((left, right) => left.amount - right.amount);

  return (
    covering[0] ?? [...sites].sort((left, right) => right.amount - left.amount)[0] ?? null
  );
};

/**
 * How a bot answers a debt it cannot currently pay.
 *
 * Mortgaging comes before selling, and that ordering is a rule of the game
 * rather than a preference: `siteActionBlockedReason` refuses a mortgage while
 * the colour group still carries buildings, so a player holding both kinds is
 * offered mortgages on the unbuilt squares and nothing else - and a bot that
 * reached for the buildings first would knock down houses it did not need to.
 * When mortgages run out, Sell is what is left.
 *
 * Returns null only when the debt is neither payable nor raisable, which the
 * caller reads as bankruptcy. The arithmetic for that is `getLiquidationValue`,
 * the same figure `confirmBankruptcy` refuses on - so the bot cannot declare a
 * bankruptcy the engine would throw out, and cannot miss one it would accept.
 */
export const raiseCashCommand = (
  state: GameState,
  playerId: PlayerId,
  amountDue: number
): RuntimeGameCommand | null => {
  const shortfall = amountDue - state.players[playerId].cash;
  if (shortfall <= 0) {
    return null;
  }

  const options = [PropertyAction.Mortgage, PropertyAction.Sell];
  for (const action of options) {
    const site = siteToLiquidate(sitesFor(state, playerId, action), shortfall);
    if (site) {
      return { type: site.command, spaceId: site.spaceId } as RuntimeGameCommand;
    }
  }
  return null;
};

/** Whether this debt is beyond everything the player has. The bankruptcy test. */
export const isRuined = (
  state: GameState,
  playerId: PlayerId,
  amountDue: number
): boolean =>
  state.players[playerId].cash + getLiquidationValue(state, playerId) < amountDue;

/**
 * A building to put up out of spare cash, or null.
 *
 * The cheapest affordable one rather than the best one, deliberately: houses
 * are the scarcest thing on the board - thirty-two of them, really decremented
 * - so a bot that buys three cheap houses has taken more of the supply than one
 * that buys a single expensive one, and denying houses is most of what building
 * is for. It also keeps the bot solvent, because the reserve is measured after
 * each purchase and the cheapest option is the one that survives it longest.
 *
 * `BOT_CASH_RESERVE` is what makes this terminate. Each build costs money and
 * raises a level, so the driver asking again after every command runs out of
 * affordable sites rather than looping.
 */
export const buildCommand = (
  state: GameState,
  playerId: PlayerId
): RuntimeGameCommand | null => {
  const cash = state.players[playerId].cash;
  const affordable = sitesFor(state, playerId, PropertyAction.Build)
    .filter((site) => cash - site.amount >= BOT_CASH_RESERVE)
    .sort((left, right) => left.amount - right.amount);

  const site = affordable[0];
  if (!site) {
    return null;
  }
  // Build is the one action whose command depends on the site's own ladder -
  // a hotel at the top of it, a house below - and `EligibleSite` carries the
  // answer, so it is never decided twice.
  return site.command === GameCommandType.BuildHotel
    ? { type: GameCommandType.BuildHotel, spaceId: site.spaceId }
    : { type: GameCommandType.BuildHouse, spaceId: site.spaceId };
};
