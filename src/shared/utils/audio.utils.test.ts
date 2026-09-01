import { describe, expect, it, vi } from 'vitest';
import { createSoundPool, playSound } from './audio.utils';

/** A stand-in for the bits of HTMLAudioElement that matter here. */
const fakeAudio = (play: () => unknown) =>
  ({ currentTime: 5, play, pause: vi.fn(), volume: 1 }) as unknown as HTMLAudioElement;

describe('playSound', () => {
  it('restarts the clip before playing it', () => {
    const audio = fakeAudio(() => Promise.resolve());

    playSound(audio);

    expect(audio.currentTime).toBe(0);
  });

  /**
   * The bug this guard exists for: play() returns undefined in older Safari and
   * some webviews, so `.catch` on it throws - and thrown from inside a timer
   * callback it stopped the rest of that callback running.
   */
  it('does not throw when play returns nothing at all', () => {
    expect(() => playSound(fakeAudio(() => undefined))).not.toThrow();
  });

  it('swallows a rejected play promise', async () => {
    const rejection = Promise.reject(new Error('autoplay blocked'));

    expect(() => playSound(fakeAudio(() => rejection))).not.toThrow();
    await expect(rejection.catch(() => 'handled')).resolves.toBe('handled');
  });

  it('swallows a play that throws outright', () => {
    expect(() =>
      playSound(
        fakeAudio(() => {
          throw new Error('not allowed');
        })
      )
    ).not.toThrow();
  });

  it('does nothing without a clip', () => {
    expect(() => playSound(null)).not.toThrow();
    expect(() => playSound(undefined)).not.toThrow();
  });
});

describe('createSoundPool', () => {
  // One element cannot overlap itself, so a fast walk lost most of its taks.
  it('hands out a different clip each call, round robin', () => {
    const pool = createSoundPool('step.wav', 3, 0.5);

    const clips = [pool.next(), pool.next(), pool.next()];

    expect(new Set(clips).size).toBe(3);
    expect(pool.next()).toBe(clips[0]);
  });

  it('sets the volume on every clip', () => {
    const pool = createSoundPool('step.wav', 2, 0.35);

    expect(pool.next().volume).toBeCloseTo(0.35);
    expect(pool.next().volume).toBeCloseTo(0.35);
  });

  it('stops every clip at once', () => {
    const pool = createSoundPool('step.wav', 2, 0.5);
    const clips = [pool.next(), pool.next()];
    clips.forEach((clip) => {
      clip.pause = vi.fn();
    });

    pool.stop();

    clips.forEach((clip) => expect(clip.pause).toHaveBeenCalled());
  });
});
