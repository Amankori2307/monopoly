import type { ThemeNouns } from '../../domain/themes/theme.interfaces';

/**
 * The edition the booklet is being read as.
 *
 * Everything in the booklet that is not the rules themselves: what the game is
 * called, what it counts in, and what it calls the things on its board.
 */
export interface RulesEdition {
  /** The masthead's name. "Monopoly" when no edition is in scope. */
  name: string;
  /**
   * Prefixes every amount. **Empty** for the generic reading, which is
   * deliberate: `formatMoney(1500, '')` is `1500`, and a bare number is the
   * honest way to state a rule that is the same in every currency.
   */
  currencySymbol: string;
  nouns: ThemeNouns;
}
