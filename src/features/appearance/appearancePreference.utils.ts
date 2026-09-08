import { logger } from '../../shared/utils/logger.utils';
import {
  APPEARANCES,
  EDITION_APPEARANCE,
  type AppearanceId,
} from '../../shared/constants/appearance.constants';

/**
 * The chosen appearance, remembered across games.
 *
 * Its own key, out of the save, for the same reason the sound preference is:
 * how the board looks should not travel with one game or reset when you start
 * another.
 *
 * Reads and writes are guarded the way the game's own storage is - a private
 * mode throws on any write, and a browser with storage blocked throws on the
 * read too. The appearance simply falls back to the edition's own colours.
 */
export const APPEARANCE_PREFERENCE_KEY = 'monopoly.appearance.v1';

const isAppearanceId = (value: string | null): value is AppearanceId =>
  APPEARANCES.some((appearance) => appearance.id === value);

export const readAppearancePreference = (): AppearanceId => {
  try {
    const stored = window.localStorage.getItem(APPEARANCE_PREFERENCE_KEY);
    // Validated rather than cast: the value is whatever is on the disk of a
    // browser that may have run an older build, and an unknown id would reach
    // data-theme and match no palette at all - a game with no colours.
    return isAppearanceId(stored) ? stored : EDITION_APPEARANCE;
  } catch (error) {
    logger.debug('appearance', 'could not read the appearance preference', { error });
    return EDITION_APPEARANCE;
  }
};

export const writeAppearancePreference = (appearance: AppearanceId): void => {
  try {
    window.localStorage.setItem(APPEARANCE_PREFERENCE_KEY, appearance);
  } catch (error) {
    logger.debug('appearance', 'could not save the appearance preference', { error });
  }
};
