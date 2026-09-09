import { describe, expect, it } from 'vitest';
import { GENERIC_EDITION } from '../../components/rules/RulesEditionContext';
import { indiaTheme } from '../../domain/themes/india.theme';
import { usTheme } from '../../domain/themes/us.theme';
import { getThemeOrDefault } from '../../domain/themes/themes.registry';

/**
 * Which edition the booklet reads as.
 *
 * The hook itself needs a store, and its one branch is a selector over
 * `activeGame?.themeId` - so the substance worth pinning is what each answer
 * resolves to. The wiring is covered by rules.spec.ts, which reads the
 * rendered booklet in a game and out of one.
 */
describe('the generic reading', () => {
  it('names no edition and prints no currency', () => {
    expect(GENERIC_EDITION.name).toBe('Monopoly');
    // Bare numbers: formatMoney(1500, '') is '1500', which is the honest way
    // to state a rule that is the same in every currency.
    expect(GENERIC_EDITION.currencySymbol).toBe('');
  });

  it('uses words true of every board', () => {
    expect(GENERIC_EDITION.nouns.site).toBe('property');
    expect(GENERIC_EDITION.nouns.railway).toBe('station');
  });
});

describe('an edition in play', () => {
  it.each([
    [indiaTheme.id, 'city', 'railway station', '₹'],
    [usTheme.id, 'street', 'railroad', '$'],
  ])('reads %s in its own words and money', (themeId, site, railway, symbol) => {
    const theme = getThemeOrDefault(themeId);

    expect(theme.nouns.site).toBe(site);
    expect(theme.nouns.railway).toBe(railway);
    expect(theme.currencySymbol).toBe(symbol);
  });

  // A saved game whose edition this build no longer has must still open.
  it('falls back rather than throwing on an edition that is gone', () => {
    expect(getThemeOrDefault('an-edition-that-was-removed').nouns.site).toBeTruthy();
  });
});
