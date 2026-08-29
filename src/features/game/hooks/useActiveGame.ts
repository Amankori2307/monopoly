import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { availableThemes } from '../../../domain/themes/indiaEditionTheme';
import type { GameState, ThemeConfig } from '../../../domain/types/game.interfaces';
import { resolveCurrencySymbol } from '../../../shared/utils/money.utils';
import { loadGameById } from '../gameSlice';

export interface UseActiveGameResult {
  activeGame: GameState | null;
  currencySymbol: string;
  loadError: string | null;
  theme: ThemeConfig | undefined;
  uiHints: string[];
}

/**
 * Loads the saved game named in the route and exposes it with its theme.
 * Keeps the load effect and theme lookup out of the page component.
 */
export const useActiveGame = (gameId: string): UseActiveGameResult => {
  const dispatch = useAppDispatch();
  const activeGame = useAppSelector((state) => state.game.activeGame);
  const loadError = useAppSelector((state) => state.game.loadError);
  const uiHints = useAppSelector((state) => state.game.uiHints);

  useEffect(() => {
    dispatch(loadGameById(gameId));
  }, [dispatch, gameId]);

  const theme = useMemo(
    () => availableThemes.find((candidate) => candidate.id === activeGame?.themeId),
    [activeGame?.themeId]
  );

  return {
    activeGame,
    currencySymbol: resolveCurrencySymbol(theme?.currencySymbol),
    loadError,
    theme,
    uiHints,
  };
};
