/** Fixed economics for non-street spaces on the India Edition board. */

export const RAILWAY_PRICE = 200;
export const RAILWAY_MORTGAGE_VALUE = 100;
/** Rent indexed by (railways owned - 1). */
export const RAILWAY_RENT_BY_COUNT: [number, number, number, number] = [25, 50, 100, 200];

export const UTILITY_PRICE = 150;
export const UTILITY_MORTGAGE_VALUE = 75;
export const UTILITY_RENT_MULTIPLIER_ONE = 4;
export const UTILITY_RENT_MULTIPLIER_BOTH = 10;

/**
 * The two tax squares' amounts.
 *
 * Constants rather than literals on the board so the ruleset doc's quoted values
 * can be checked against them - and because an amount written into a board entry
 * is exactly the kind the no-hardcoded-amounts rule exists for.
 */
export const INCOME_TAX_AMOUNT = 200;
export const SUPER_TAX_AMOUNT = 100;
