/**
 * Ruleset values for the India Edition. Nothing outside this file should
 * hardcode a money amount, a board index, or a bank inventory count.
 *
 * Changing a value here changes the game; see docs/india-edition-rules.md.
 */

/** Bumped whenever the persisted GameState shape changes. Requires a migration. */
export const GAME_STATE_VERSION = 1;

export const STARTING_CASH = 1500;
export const PASS_GO_AMOUNT = 200;
export const JAIL_FINE = 50;

/** Interest added to the mortgage value when redeeming a mortgaged site. */
export const MORTGAGE_INTEREST_PERCENT = 10;
/** Buildings sell back to the bank at this share of their purchase price. */
export const BUILDING_SELL_PERCENT = 50;

export const AUCTION_START_PRICE = 10;
export const AUCTION_MIN_INCREMENT = 1;

export const BOARD_SIZE = 40;
export const JAIL_POSITION = 10;
export const GO_POSITION = 0;
/** Board indices that sit on a corner track. */
export const CORNER_POSITIONS = [0, 10, 20, 30] as const;

export const HOUSES_AVAILABLE = 32;
export const HOTELS_AVAILABLE = 12;
/** Build level at which a property holds a hotel rather than houses. */
export const HOTEL_BUILD_LEVEL = 5;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export const MAX_JAIL_TURNS = 3;
export const DOUBLES_BEFORE_JAIL = 3;

export const DIE_MIN = 1;
export const DIE_MAX = 6;
export const DICE_PER_ROLL = 2;

/** History is capped so a long game cannot grow the saved state without bound. */
export const MAX_HISTORY_EVENTS = 120;

export const DEFAULT_CURRENCY_SYMBOL = '₹';

/** Speed Die variant, documented in the rules booklet but not implemented. */
export const SPEED_DIE_BONUS_CASH = 1000;
