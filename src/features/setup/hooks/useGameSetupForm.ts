import { useCallback, useEffect, useMemo, useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../../domain/constants/game.constants';
import {
  availableThemes,
  indiaEditionTheme,
} from '../../../domain/themes/indiaEditionTheme';
import type {
  CreatePlayerInput,
  ThemeConfig,
} from '../../../domain/types/game.interfaces';
import { DEFAULT_GAME_NAME } from '../setup.constants';
import { trimPlayerNames, validateSetupDraft } from '../setupValidation.utils';

export interface UseGameSetupFormResult {
  formError: string | null;
  gameName: string;
  playerCount: number;
  playerNames: string[];
  playerTokens: string[];
  selectedTheme: ThemeConfig;
  setGameName: (value: string) => void;
  setPlayerCount: (value: number) => void;
  setPlayerName: (index: number, value: string) => void;
  setPlayerToken: (index: number, value: string) => void;
  setThemeId: (value: string) => void;
  themeId: string;
  /** Validates and returns the player configs, or null when invalid. */
  validate: () => CreatePlayerInput[] | null;
}

const clampPlayerCount = (value: number) =>
  Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, value));

const defaultNames = (count: number, current: string[] = []) =>
  Array.from({ length: count }, (_, index) => current[index] ?? `Player ${index + 1}`);

const defaultTokens = (count: number, current: string[] = []) =>
  Array.from(
    { length: count },
    (_, index) => current[index] ?? indiaEditionTheme.tokenCatalog[index].id
  );

/**
 * Owns the setup form's state and validation. The page renders it; the rules
 * are testable through validateSetupDraft without mounting anything.
 */
export const useGameSetupForm = (): UseGameSetupFormResult => {
  const [gameName, setGameName] = useState(DEFAULT_GAME_NAME);
  const [playerCount, setPlayerCountState] = useState(MIN_PLAYERS);
  const [themeId, setThemeId] = useState(indiaEditionTheme.id);
  const [playerNames, setPlayerNames] = useState(() => defaultNames(MIN_PLAYERS));
  const [playerTokens, setPlayerTokens] = useState(() => defaultTokens(MIN_PLAYERS));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setPlayerNames((current) => defaultNames(playerCount, current));
    setPlayerTokens((current) => defaultTokens(playerCount, current));
  }, [playerCount]);

  const selectedTheme = useMemo(
    () => availableThemes.find((theme) => theme.id === themeId) ?? indiaEditionTheme,
    [themeId]
  );

  const setPlayerName = useCallback((index: number, value: string) => {
    setPlayerNames((current) => current.map((name, i) => (i === index ? value : name)));
  }, []);

  const setPlayerToken = useCallback((index: number, value: string) => {
    setPlayerTokens((current) =>
      current.map((token, i) => (i === index ? value : token))
    );
  }, []);

  const validate = useCallback((): CreatePlayerInput[] | null => {
    const error = validateSetupDraft({ playerNames, playerTokens });
    setFormError(error);
    if (error) {
      return null;
    }
    return trimPlayerNames(playerNames).map((name, index) => ({
      name,
      tokenId: playerTokens[index],
    }));
  }, [playerNames, playerTokens]);

  return {
    formError,
    gameName,
    playerCount,
    playerNames,
    playerTokens,
    selectedTheme,
    setGameName,
    setPlayerCount: (value: number) => setPlayerCountState(clampPlayerCount(value)),
    setPlayerName,
    setPlayerToken,
    setThemeId,
    themeId,
    validate,
  };
};
