import { useMemo, useState } from 'react';
import { availableThemes, defaultTheme } from '../../../domain/themes/themes.registry';
import type { GameTheme } from '../../../domain/themes/theme.interfaces';

interface UseHostTableFormResult {
  hostName: string;
  setHostName: (value: string) => void;
  themeId: string;
  setThemeId: (value: string) => void;
  useSpeedDie: boolean;
  setUseSpeedDie: (value: boolean) => void;
  selectedTheme: GameTheme;
  /** Why the table cannot be opened yet, or null. */
  blockedReason: string | null;
}

/**
 * What the host settles before the table exists.
 *
 * **Valid on first render, deliberately.** Every field is prefilled, so opening
 * a table is one click - which is what it was from the old home page, and what
 * `tests/online/twoDevices.spec.ts` still does. A required empty field here
 * would turn that spec's one click into a fill step, in a suite that writes to
 * a real project and cannot be run locally.
 *
 * The edition and the Speed Die live here because the lobby had no UI for
 * either and hardcoded them - `themeId: availableThemes[0].id, useSpeedDie:
 * false` - so an online game could never be a Speed Die game, and a table was
 * always the first edition whatever the host wanted.
 */
export const useHostTableForm = (): UseHostTableFormResult => {
  const [hostName, setHostName] = useState('Player 1');
  const [themeId, setThemeId] = useState(defaultTheme.id);
  const [useSpeedDie, setUseSpeedDie] = useState(false);

  const selectedTheme = useMemo(
    () => availableThemes.find((theme) => theme.id === themeId) ?? defaultTheme,
    [themeId]
  );

  // There was a token here, and a fallback for it: a piece from the previous
  // edition existed in no other, so switching the ruleset sent the table an id
  // its board had no drawing for. Both are gone - the palette is one list and a
  // colour is assigned by seat, so an edition cannot disagree with it.
  return {
    hostName,
    setHostName,
    themeId,
    setThemeId,
    useSpeedDie,
    setUseSpeedDie,
    selectedTheme,
    blockedReason: hostName.trim() ? null : 'Enter a name first',
  };
};
