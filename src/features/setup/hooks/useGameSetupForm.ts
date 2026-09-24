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
  /** Hands a seat to the machine, or takes it back. */
  setPlayerIsBot: (index: number, value: boolean) => void;
  /** Which seats the machine plays, by the same index as `playerNames`. */
  playerIsBot: boolean[];
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
 * Seats added by raising the player count are people, like every seat was
 * before bots existed. Growing the table is not a request for opponents, and a
 * form that quietly turned one into a bot would be a surprise at the board.
 */
const defaultBots = (count: number, current: boolean[] = []) =>
  Array.from({ length: count }, (_, index) => current[index] ?? false);

/** What to call a seat handed to the machine, when its name is still the default. */
const BOT_NAME_PREFIX = 'Bot';

const isUntouchedName = (name: string, index: number): boolean =>
  name === `Player ${index + 1}` || name === `${BOT_NAME_PREFIX} ${index + 1}`;

/**
 * Owns the setup form's state and validation. The page renders it; the rules
 * are testable through validateSetupDraft without mounting anything.
 */
export const useGameSetupForm = (): UseGameSetupFormResult => {
  const [gameName, setGameName] = useState(DEFAULT_GAME_NAME);
  const [playerCount, setPlayerCountState] = useState(MIN_PLAYERS);
  const [themeId, setThemeId] = useState(defaultTheme.id);
  const [playerNames, setPlayerNames] = useState(() => defaultNames(MIN_PLAYERS));
  const [playerIsBot, setPlayerIsBot] = useState(() => defaultBots(MIN_PLAYERS));
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
    setPlayerIsBot((current) => defaultBots(playerCount, current));
  }, [playerCount]);

  const setPlayerName = useCallback((index: number, value: string) => {
    setPlayerNames((current) => current.map((name, i) => (i === index ? value : name)));
  }, []);

  /**
   * Renames the seat too, but ONLY while its name is still one this form wrote.
   *
   * "Player 2" and "Bot 2" are placeholders; anything else is something a
   * person typed, and overwriting that is the kind of helpfulness that loses
   * work. The rename matters because the name is what the history, the toasts
   * and the player card all say - a bot called "Player 2" is indistinguishable
   * from the human beside it in every sentence the game speaks.
   */
  const setPlayerIsBotAt = useCallback((index: number, value: boolean) => {
    setPlayerIsBot((current) => current.map((flag, i) => (i === index ? value : flag)));
    setPlayerNames((current) =>
      current.map((name, i) => {
        if (i !== index || !isUntouchedName(name, i)) {
          return name;
        }
        return value ? `${BOT_NAME_PREFIX} ${i + 1}` : `Player ${i + 1}`;
      })
    );
  }, []);

  const validate = useCallback((): CreatePlayerInput[] | null => {
    const error = validateSetupDraft({ playerNames, playerIsBot });
    setFormError(error);
    if (error) {
      return null;
    }
    return trimPlayerNames(playerNames).map((name, index) => ({
      name,
      isBot: playerIsBot[index] ?? false,
    }));
  }, [playerIsBot, playerNames]);

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
    playerIsBot,
    setPlayerName,
    setPlayerIsBot: setPlayerIsBotAt,
    setThemeId,
    setUseSpeedDie,
    themeId,
    useSpeedDie,
    validate,
  };
};
