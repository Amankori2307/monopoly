import { useEffect, useRef } from 'react';
import { playSound } from '../../../shared/utils/audio.utils';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { CUE_VOLUME, SOUND_FOR_CUE } from '../soundCues.constants';
import { setSoundCue } from '../uiSlice';

/**
 * Sounds whatever just happened.
 *
 * The cue is chosen in the thunk from the events one command appended, so a
 * sound and its toast are always the same event - the property the toast feed
 * already has with the game record.
 *
 * Playing from a hook rather than the thunk is the arrangement the rest of the
 * game uses: `useDiceRoller` and `useAnimatedTokenPositions` own their own
 * audio, and a thunk that touched an Audio element would be the odd one out.
 *
 * It keys on the cue's **id**, not its value, so paying rent twice in a row is
 * two sounds. And it clears the cue after playing, so a re-render cannot replay
 * it.
 */
export const useGameSounds = (): void => {
  const dispatch = useAppDispatch();
  const soundCue = useAppSelector((state) => state.ui.soundCue);
  const soundEnabled = useAppSelector((state) => state.ui.soundEnabled);
  const clipsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const clips = clipsRef.current;

    return () => {
      clips.forEach((clip) => clip.pause());
      clips.clear();
    };
  }, []);

  useEffect(() => {
    if (!soundCue) {
      return;
    }
    // Cleared even when muted, so nothing is queued up waiting to fire the
    // moment sound comes back on.
    dispatch(setSoundCue(null));
    if (!soundEnabled) {
      return;
    }

    const source = SOUND_FOR_CUE[soundCue.cue];
    if (!source) {
      return;
    }

    // One element per clip, made on first use: nine files eagerly loaded on
    // mount is a lot of fetching for sounds most turns never reach.
    let clip = clipsRef.current.get(source);
    if (!clip) {
      clip = new Audio(source);
      clip.volume = CUE_VOLUME;
      clipsRef.current.set(source, clip);
    }
    playSound(clip);
  }, [dispatch, soundCue, soundEnabled]);
};
