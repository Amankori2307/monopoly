import { STARTING_CASH } from '../constants/game.constants';

/**
 * How a bot values things, in one place.
 *
 * Every number here is a judgement about play rather than a rule of the game,
 * which is exactly why they are not in `gameEngine.ts` beside the locked
 * economics: those are the printed ruleset and changing one changes what
 * Monopoly is, whereas changing these only changes how well a bot plays it.
 */

/**
 * The float a bot will not spend down to.
 *
 * Its whole job is the next rent bill. A bot that spends to its last rupee owns
 * a great deal and goes bankrupt to the first railway it lands on, which is a
 * worse opponent than one that owns less: it leaves the table, and a
 * two-player game ends.
 *
 * A fraction of the starting cash rather than a literal, so it stays sensible
 * if the economics are ever rebalanced.
 */
export const BOT_CASH_RESERVE = Math.round(STARTING_CASH * 0.2);

/**
 * What a bot will pay at auction, as a multiple of the printed price.
 *
 * Over 1 for a square that completes a colour set, because a set is what makes
 * money in this game and the printed price does not know that - it is the same
 * number whether the buyer holds the other two or none of them. Under 1
 * otherwise: an auction only happens because somebody declined at the printed
 * price, so paying it in full is paying for the privilege of bidding.
 */
export const BOT_AUCTION_CEILING_WANTED = 1.35;
export const BOT_AUCTION_CEILING_ORDINARY = 0.7;
