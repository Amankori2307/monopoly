import type { ThemeToken } from '../../domain/types/game.interfaces';

/**
 * A token id resolved to theme data.
 *
 * Selectors that need a player's colour take one of these rather than the whole
 * theme, so they stay independent of how the theme is loaded. `makeTokenFinder`
 * in gameView.selectors is what builds one.
 */
export type TokenFinder = (tokenId: string) => ThemeToken | undefined;
