import { logger } from '../../shared/utils/logger.utils';

/**
 * Whether sound is on, remembered across games.
 *
 * A preference, not game state, so it lives under its own key and stays out of
 * the save - a mute should not travel with one game or reset when you start
 * another.
 *
 * Reads and writes are guarded the same way the game's own storage is: private
 * modes throw on any write, and a browser with storage blocked throws on the
 * read too. Sound simply defaults to on there.
 */
export const SOUND_PREFERENCE_KEY = 'monopoly.sound.v1';

export const readSoundPreference = (): boolean => {
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== 'off';
  } catch (error) {
    logger.debug('sound', 'could not read the sound preference', { error });
    return true;
  }
};

export const writeSoundPreference = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? 'on' : 'off');
  } catch (error) {
    logger.debug('sound', 'could not save the sound preference', { error });
  }
};
