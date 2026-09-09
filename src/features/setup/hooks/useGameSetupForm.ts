import { useCallback, useEffect, useMemo, useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../../domain/constants/game.constants';
import { availableThemes, defaultTheme } from '../../../domain/themes/themes.registry';
import type {
  CreatePlayerInput,
  ThemeConfig,
  ThemeToken,
} from '../../../domain/types/game.interfaces';
import { DEFAULT_GAME_NAME } from '../setup.constants';
import { trimPlayerNames, validateSetupDraft } from '../setupValidation.utils';

export interface UseGameSetupFormResult {
  formError: string | null;
  /** The host's own name and token, for opening an online table. */
  firstPlayer: () => { name: string; tokenId: string };
  setFormError: (message: string | null) => void;
  gameName: string;
  playerCount: number;
  playerNames: string[];
  playerTokens: string[];
  selectedTheme: ThemeConfig;
  setGameName: (value: string) => void;
  setPlayerCount: (value: number) => void;
  /** Set when a typed player count was outside 2-8 and had to be pulled back. */
  playerCountNotice: string | null;
  setPlayerName: (index: number, value: string) => void;
  setPlayerToken: (index: number, value: string) => void;
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
 * Tokens for `count` players, from THIS edition's catalog.
 *
 * It read `indiaEditionTheme.tokenCatalog` regardless of the edition selected,
 * and the effect below only re-ran on `playerCount` - so picking any other
 * edition left ids like `elephant` that exist in no other catalog. The token
 * finder then returned undefined and every player rendered as a colourless,
 * emoji-less disc, on a board where colour is the only thing telling them
 * apart. `useHostTableForm` already solved this; this is the same shape.
 */
const defaultTokens = (catalog: ThemeToken[], count: number, current: string[] = []) =>
  Array.from({ length: count }, (_, index) => {
    const held = current[index];
    // Keep what the player chose, unless this edition has no such piece.
    return held && catalog.some((token) => token.id === held)
      ? held
      : (catalog[index % catalog.length]?.id ?? catalog[0].id);
  });

/**
 * Owns the setup form's state and validation. The page renders it; the rules
 * are testable through validateSetupDraft without mounting anything.
 */
export const useGameSetupForm = (): UseGameSetupFormResult => {
  const [gameName, setGameName] = useState(DEFAULT_GAME_NAME);
  const [playerCount, setPlayerCountState] = useState(MIN_PLAYERS);
  const [themeId, setThemeId] = useState(defaultTheme.id);
  const [playerNames, setPlayerNames] = useState(() => defaultNames(MIN_PLAYERS));
  const [playerTokens, setPlayerTokens] = useState(() =>
    defaultTokens(defaultTheme.tokenCatalog, MIN_PLAYERS)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [useSpeedDie, setUseSpeedDie] = useState(false);
  const [playerCountNotice, setPlayerCountNotice] = useState<string | null>(null);

  const selectedTheme = useMemo(
    () => availableThemes.find((theme) => theme.id === themeId) ?? defaultTheme,
    [themeId]
  );

  // Keyed on the EDITION as well as the count. It was `[playerCount]` only, so
  // switching edition left every player holding a piece that edition does not
  // have - see defaultTokens.
  useEffect(() => {
    setPlayerNames((current) => defaultNames(playerCount, current));
    setPlayerTokens((current) =>
      defaultTokens(selectedTheme.tokenCatalog, playerCount, current)
    );
  }, [playerCount, selectedTheme]);

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
    /**
     * The host's own name and token, for opening an online table.
     *
     * Reuses the form the player has already filled in rather than asking
     * again on the lobby screen - they are one flow, not two.
     */
    firstPlayer: () => ({
      name: trimPlayerNames(playerNames)[0] || 'Player 1',
      tokenId: playerTokens[0],
    }),
    setFormError,
    formError,
    gameName,
    playerCount,
    playerCountNotice,
    playerNames,
    playerTokens,
    selectedTheme,
    setGameName,
    // Clamping in silence looked like the input ignoring the keyboard, so it
    // says what it did instead.
    setPlayerCount: (value: number) => {
      const clamped = clampPlayerCount(value);
      setPlayerCountState(clamped);
      setPlayerCountNotice(
        Number.isFinite(value) && value !== clamped
          ? `This game takes ${MIN_PLAYERS} to ${MAX_PLAYERS} players, so that is now ${clamped}.`
          : null
      );
    },
    setPlayerName,
    setPlayerToken,
    setThemeId,
    setUseSpeedDie,
    themeId,
    useSpeedDie,
    validate,
  };
};
