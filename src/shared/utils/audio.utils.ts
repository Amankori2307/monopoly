/**
 * Playing a short sound effect, safely.
 *
 * `HTMLMediaElement.play()` returns a promise in current browsers but `undefined`
 * in older Safari and some embedded webviews, so `audio.play().catch(...)` throws
 * a TypeError there. That is not hypothetical: the dice dock hit it, and calling
 * it from inside a timer callback stopped the rest of the callback running. Both
 * the dice roll and the token step go through here now, so the guard exists once.
 */

/** Restarts a clip and plays it. Never throws, and never rejects. */
export const playSound = (audio: HTMLAudioElement | null | undefined): void => {
  if (!audio) {
    return;
  }
  try {
    audio.currentTime = 0;
    const played: unknown = audio.play();
    if (played instanceof Promise) {
      void played.catch(() => undefined);
    }
  } catch {
    // No sound. Whatever asked for it carries on regardless.
  }
};

/**
 * A round-robin pool of clones of one clip.
 *
 * A single element cannot overlap itself: restarting it cuts off the tak still
 * sounding, so a fast walk dropped most of its steps. `next()` hands out the
 * least recently used copy instead.
 */
export const createSoundPool = (source: string, size: number, volume: number) => {
  const clips = Array.from({ length: size }, () => {
    const audio = new Audio(source);
    audio.volume = volume;
    return audio;
  });
  let cursor = 0;

  return {
    next: (): HTMLAudioElement => {
      const clip = clips[cursor];
      cursor = (cursor + 1) % clips.length;
      return clip;
    },
    stop: () => clips.forEach((clip) => clip.pause()),
  };
};
