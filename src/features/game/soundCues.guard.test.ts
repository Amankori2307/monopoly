import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameEventCue } from '../../domain/types/game.enums';
import { CUE_PRIORITY, SOUND_FOR_CUE } from './soundCues.constants';

/**
 * Every cue has been thought about, and every clip behind one is audible.
 *
 * Two failures this exists for. A cue added to the enum with no manifest entry
 * would draw in silence and nobody would notice, because silence is what the
 * game did before. And a clip that is long or slow to start is a clip nobody
 * hears - the token step shipped 1373ms long with its first sound 177ms in, and
 * was inaudible at every pace the walk used. That was caught by measuring, so
 * these are measured too.
 *
 * Same tactic as diceRolling.guard.test.ts: assert a property of the codebase
 * that no single component's own test can see.
 */

const AUDIO_DIR = join(process.cwd(), 'src/assets/audio');

/** How long a cue may last. The win fanfare is allowed to be a fanfare. */
const MAX_MS: Partial<Record<GameEventCue, number>> = { [GameEventCue.Won]: 1500 };
const DEFAULT_MAX_MS = 800;

interface Clip {
  durationMs: number;
  channels: number;
  peak: number;
  onsetMs: number;
  bytes: number;
}

/** Enough of a RIFF/WAVE header to measure a clip. */
const readWav = (fileName: string): Clip => {
  const path = join(AUDIO_DIR, fileName);
  expect(existsSync(path), `${fileName} is in the manifest but not on disk`).toBe(true);
  const buffer = readFileSync(path);

  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);

  let offset = 12;
  let dataOffset = 0;
  let dataBytes = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'data') {
      dataOffset = offset + 8;
      dataBytes = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }

  const bytesPerFrame = channels * (bitsPerSample / 8);
  const frames = dataBytes / bytesPerFrame;
  const amplitudes: number[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    let loudest = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      loudest = Math.max(
        loudest,
        Math.abs(buffer.readInt16LE(dataOffset + frame * bytesPerFrame + channel * 2))
      );
    }
    amplitudes.push(loudest);
  }
  const peak = Math.max(...amplitudes);

  return {
    durationMs: (frames / sampleRate) * 1000,
    channels,
    peak,
    onsetMs: (amplitudes.findIndex((value) => value > peak * 0.5) / sampleRate) * 1000,
    bytes: buffer.byteLength,
  };
};

/** The file name a manifest entry resolves to, whatever the bundler made of it. */
const fileNameOf = (source: string): string =>
  source.split('/').pop()?.split('?')[0] ?? source;

const sounded = Object.entries(SOUND_FOR_CUE).filter(([, source]) => source !== null) as [
  GameEventCue,
  string,
][];

describe('the cue sounds', () => {
  /**
   * A new cue cannot ship silent by accident. `null` is a decision; missing is
   * an oversight, and TypeScript's Record already refuses the second - this
   * catches the enum growing without the manifest, which it would not.
   */
  it('has an entry for every cue the engine can set', () => {
    const cues = Object.values(GameEventCue);

    expect(Object.keys(SOUND_FOR_CUE).sort()).toEqual([...cues].sort());
  });

  it('sounds something for every cue in the priority list', () => {
    CUE_PRIORITY.forEach((cue) => {
      expect(SOUND_FOR_CUE[cue], `${cue} is prioritised but silent`).toBeTruthy();
    });
  });

  it('leaves exactly one cue deliberately silent', () => {
    const silent = Object.entries(SOUND_FOR_CUE)
      .filter(([, source]) => source === null)
      .map(([cue]) => cue);

    expect(silent).toEqual([GameEventCue.None]);
  });

  it.each(sounded)('%s has a clip that is actually on disk', (_cue, source) => {
    expect(existsSync(join(AUDIO_DIR, fileNameOf(source)))).toBe(true);
  });

  it.each(sounded)('%s sounds from its first few milliseconds', (_cue, source) => {
    expect(readWav(fileNameOf(source)).onsetMs).toBeLessThan(10);
  });

  it.each(sounded)('%s is short enough to be feedback, not a track', (cue, source) => {
    const limit = MAX_MS[cue] ?? DEFAULT_MAX_MS;

    expect(readWav(fileNameOf(source)).durationMs).toBeLessThanOrEqual(limit);
  });

  it.each(sounded)('%s is mono and leaves headroom', (_cue, source) => {
    const clip = readWav(fileNameOf(source));

    expect(clip.channels).toBe(1);
    expect(clip.peak).toBeGreaterThan(0.5 * 32767);
    expect(clip.peak).toBeLessThan(0.95 * 32767);
  });

  it('ships a modest amount of audio in total', () => {
    const total = sounded.reduce(
      (bytes, [, source]) => bytes + readWav(fileNameOf(source)).bytes,
      0
    );

    expect(total).toBeLessThan(500 * 1024);
  });
});
