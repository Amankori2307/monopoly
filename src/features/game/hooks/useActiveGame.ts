import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { availableThemes } from '../../../domain/themes/indiaEditionTheme';
import type { GameState, ThemeConfig } from '../../../domain/types/game.interfaces';
import { resolveCurrencySymbol } from '../../../shared/utils/money.utils';
import { logger } from '../../../shared/utils/logger.utils';
import { selectHasAvailableAction } from '../gameView.selectors';
import { loadGameById } from '../gameSlice';

export interface UseActiveGameResult {
  activeGame: GameState | null;
  commandError: string | null;
  currencySymbol: string;
  loadError: string | null;
  theme: ThemeConfig | undefined;
}

/**
 * Loads the saved game named in the route and exposes it with its theme.
 * Keeps the load effect and theme lookup out of the page component.
 */
export const useActiveGame = (gameId: string): UseActiveGameResult => {
  const dispatch = useAppDispatch();
  const activeGame = useAppSelector((state) => state.game.activeGame);
  const loadError = useAppSelector((state) => state.game.loadError);
  const commandError = useAppSelector((state) => state.game.commandError);

  useEffect(() => {
    dispatch(loadGameById(gameId));
  }, [dispatch, gameId]);

  const theme = useMemo(
    () => availableThemes.find((candidate) => candidate.id === activeGame?.themeId),
    [activeGame?.themeId]
  );

  // A state with no available action is a deadlock. It should be impossible;
  // log it loudly with the state that produced it if it ever happens.
  useEffect(() => {
    if (activeGame && !selectHasAvailableAction(activeGame)) {
      logger.error('gameState', 'no available action - the game is stuck', {
        gameId: activeGame.id,
        turnNumber: activeGame.turnNumber,
        phase: activeGame.turn.phase,
        pendingDecision: activeGame.pendingDecision.type,
        activePlayer:
          activeGame.players[activeGame.playerOrder[activeGame.activePlayerIndex]],
      });
    }
  }, [activeGame]);

  return {
    activeGame,
    commandError,
    currencySymbol: resolveCurrencySymbol(theme?.currencySymbol),
    loadError,
    theme,
  };
};
