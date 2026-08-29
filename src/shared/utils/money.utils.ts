import { DEFAULT_CURRENCY_SYMBOL } from '../../domain/constants/game.constants';

/**
 * Single place that renders a money amount. Previously the
 * `currencySymbol ?? 'M'` fallback was repeated at every call site.
 */
export const formatMoney = (
  amount: number,
  currencySymbol: string = DEFAULT_CURRENCY_SYMBOL
) => `${currencySymbol}${amount}`;

export const resolveCurrencySymbol = (currencySymbol?: string) =>
  currencySymbol ?? DEFAULT_CURRENCY_SYMBOL;
