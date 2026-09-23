import { useCallback, useEffect, useMemo, useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../../domain/constants/game.constants';
import { availableThemes, defaultTheme } from '../../../domain/themes/themes.registry';
import type {
  CreatePlayerInput,
  ThemeConfig,
} from '../../../domain/types/game.interfaces';
import { DEFAULT_GAME_NAME } from '../setup.constants';
import { trimPlayerNames, validateSetupDraft } from '../setupValidation.utils';

export interface UseGameSetupFormResult {
  formError: string | null;
  setFormError: (message: string | null) => void;
  gameName: string;
  playerCount: number;
  playerNames: string[];
  selectedTheme: ThemeConfig;
  setGameName: (value: string) => void;
  setPlayerCount: (value: number) => void;
  /** Set when a typed player count was outside 2-8 and had to be pulled back. */
  playerCountNotice: string | null;
  setPlayerName: (index: number, value: string) => void;
  setThemeId: (value: string) => void;
  setUseSpeedDie: (value: boolean) => void;
  themeId: string;
  /** Agreed before the game starts; it cannot be switched on mid-game. */
  useSpeedDie: boolean;
  /** Validates and returns the player configs, or null when invalid. */
  validate: () => CreatePlayerInput[] | null;
}

const clampPlayerCount = (value: number) =>
  Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, value));

const defaultNames = (count: number, current: string[] = []) =>
  Array.from({ length: count }, (_, index) => current[index] ?? `Player ${index + 1}`);

/**
 * Owns the setup form's state and validation. The page renders it; the rules
 * are testable through validateSetupDraft without mounting anything.
 */
export const useGameSetupForm = (): UseGameSetupFormResult => {
  const [gameName, setGameName] = useState(DEFAULT_GAME_NAME);
  const [playerCount, setPlayerCountState] = useState(MIN_PLAYERS);
  const [themeId, setThemeId] = useState(defaultTheme.id);
  const [playerNames, setPlayerNames] = useState(() => defaultNames(MIN_PLAYERS));
  const [formError, setFormError] = useState<string | null>(null);
  const [useSpeedDie, setUseSpeedDie] = useState(false);
  const [playerCountNotice, setPlayerCountNotice] = useState<string | null>(null);

  const selectedTheme = useMemo(
    () => availableThemes.find((theme) => theme.id === themeId) ?? defaultTheme,
    [themeId]
  );

  // Only the count now. It used to be keyed on the EDITION too, because a
  // token id from one edition existed in no other and left every player a
  // colourless disc - and that whole class of bug went with the pieces: the
  // palette is one list and a colour is assigned by the engine, not carried in
  // this form. See domain/themes/playerColors.constants.
  useEffect(() => {
    setPlayerNames((current) => defaultNames(playerCount, current));
  }, [playerCount]);

  const setPlayerName = useCallback((index: number, value: string) => {
    setPlayerNames((current) => current.map((name, i) => (i === index ? value : name)));
  }, []);

  const validate = useCallback((): CreatePlayerInput[] | null => {
    const error = validateSetupDraft({ playerNames });
    setFormError(error);
    if (error) {
      return null;
    }
    return trimPlayerNames(playerNames).map((name) => ({ name }));
  }, [playerNames]);

  return {
    setFormError,
    formError,
    gameName,
    playerCount,
    playerCountNotice,
    playerNames,
    selectedTheme,
    setGameName,
    // Clamping in silence looked like the input ignoring the keyboard, so it
    // says what it did instead.
    setPlayerCount: (value: number) => {
      const clamped = clampPlayerCount(value);
      setPlayerCountState(clamped);
      setPlayerCountNotice(
        Number.isFinite(value) && value !== clamped
          ? `A game takes ${MIN_PLAYERS} to ${MAX_PLAYERS} players. Set to ${clamped}.`
          : null
      );
    },
    setPlayerName,
    setThemeId,
    setUseSpeedDie,
    themeId,
    useSpeedDie,
    validate,
  };
};
