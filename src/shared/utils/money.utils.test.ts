import { describe, expect, it } from 'vitest';
import { DEFAULT_CURRENCY_SYMBOL } from '../../domain/constants/game.constants';
import { formatMoney, resolveCurrencySymbol } from './money.utils';

describe('formatMoney', () => {
  it('prefixes the given currency symbol', () => {
    expect(formatMoney(1500, 'M')).toBe('M1500');
  });

  it('falls back to the default symbol', () => {
    expect(formatMoney(200)).toBe(`${DEFAULT_CURRENCY_SYMBOL}200`);
  });

  it('formats zero and negative amounts', () => {
    expect(formatMoney(0, 'M')).toBe('M0');
    expect(formatMoney(-50, 'M')).toBe('M-50');
  });
});

describe('resolveCurrencySymbol', () => {
  it('returns the default when undefined', () => {
    expect(resolveCurrencySymbol(undefined)).toBe(DEFAULT_CURRENCY_SYMBOL);
  });

  it('returns the provided symbol', () => {
    expect(resolveCurrencySymbol('₹')).toBe('₹');
  });
});
