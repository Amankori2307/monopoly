import type { ThemeNouns } from './theme.interfaces';
import { getThemeOrDefault } from './themes.registry';

/**
 * The edition's own words for its squares, for the rules the engine states.
 *
 * The booklet already reads its vocabulary off the theme; the engine and the
 * blocked reasons were the last place that did not, so "Only streets carry
 * buildings" was shown on a board of cities. Any refusal or event that names a
 * kind of square resolves it here rather than writing a word into the sentence
 * - the same reason `money()` resolves the currency symbol.
 */
export const nounsFor = (themeId: string): ThemeNouns => getThemeOrDefault(themeId).nouns;

/**
 * A count and the edition's word for what is being counted: "1 city",
 * "3 cities".
 *
 * The bankruptcy messages used to say "3 site(s)", which is the ugliest
 * construction in the app landing at the most dramatic moment in a game.
 */
export const countSites = (themeId: string, count: number): string => {
  const nouns = nounsFor(themeId);
  return `${count} ${count === 1 ? nouns.site : nouns.sites}`;
};
