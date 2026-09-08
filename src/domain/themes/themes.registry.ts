import { indiaTheme } from './india.theme';
import { internationalTheme } from './international.theme';
import { usTheme } from './us.theme';
import { worldTheme } from './world.theme';
import type { GameTheme } from './theme.interfaces';

/**
 * Every edition the game can be played as.
 *
 * **Adding a theme is a file and a line here.** Nothing else: the board is
 * built from the theme's names, the cards from its currency and names, and the
 * ruleset picker reads this list. The one thing still outside the theme file is
 * its colour palette, which lives in `styles/themes/_themes.scss` keyed by the
 * same `id` - moving that in is the next phase.
 *
 * Order matters only in that the first is the default.
 */
export const availableThemes: readonly GameTheme[] = [
  indiaTheme,
  internationalTheme,
  usTheme,
  worldTheme,
];

/** The one a game falls back to when its saved `themeId` names nothing. */
export const defaultTheme: GameTheme = indiaTheme;

/**
 * The theme a game is played as.
 *
 * Falls back rather than throwing, because the id comes off a save: a game
 * written by a build that had a theme this one does not must still open. It
 * opens in the default theme, with its own board - the board travels inside
 * `GameState`, so the squares keep the names they were bought under.
 */
export const getThemeOrDefault = (themeId: string): GameTheme =>
  availableThemes.find((theme) => theme.id === themeId) ?? defaultTheme;
