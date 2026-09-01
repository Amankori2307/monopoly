import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOKEN_MIN_STEP_INTERVAL_MS } from '../diceDock.constants';

/**
 * The step clip itself, measured.
 *
 * Not a style preference: the walk retriggers this sound every 70-180ms, so a
 * clip that is long or slow to start is one that never actually sounds. The one
 * this replaced was 1373ms with its first audible sample 177ms in, so at the
 * fastest pace it was cut off before making any sound at all - and no amount of
 * volume could fix that. These are the two properties that have to hold.
 */

const STEP_CLIP = 'src/assets/audio/token-step.wav';

/** Enough of a RIFF/WAVE header to measure a clip. */
const readWav = (path: string) => {
  const buffer = readFileSync(path);
  expect(buffer.toString('ascii', 0, 4)).toBe('RIFF');
  expect(buffer.toString('ascii', 8, 12)).toBe('WAVE');

  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);

  // Walk the chunks rather than assuming data starts at 44: a writer is free to
  // put LIST or fact chunks before it.
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
  expect(dataBytes).toBeGreaterThan(0);

  const bytesPerFrame = channels * (bitsPerSample / 8);
  const frames = dataBytes / bytesPerFrame;

  /** Peak absolute amplitude per frame, mixed down across channels. */
  const amplitudes: number[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    let loudest = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const at = dataOffset + frame * bytesPerFrame + channel * 2;
      loudest = Math.max(loudest, Math.abs(buffer.readInt16LE(at)));
    }
    amplitudes.push(loudest);
  }

  const peak = Math.max(...amplitudes);
  const onsetFrame = amplitudes.findIndex((value) => value > peak * 0.5);

  return {
    channels,
    sampleRate,
    durationMs: (frames / sampleRate) * 1000,
    peak,
    onsetMs: (onsetFrame / sampleRate) * 1000,
  };
};

describe('the token step clip', () => {
  const clip = readWav(STEP_CLIP);

  // The property that was broken: a clip longer than the interval is a clip the
  // next step cuts off.
  it('finishes inside the fastest step the walk takes', () => {
    expect(clip.durationMs).toBeLessThanOrEqual(TOKEN_MIN_STEP_INTERVAL_MS);
  });

  it('makes its sound immediately, not after a run-up', () => {
    expect(clip.onsetMs).toBeLessThan(2);
  });

  it('is mono, since a step has no direction to pan to', () => {
    expect(clip.channels).toBe(1);
  });

  it('is loud enough to be heard at the step volume', () => {
    // Well clear of the noise floor, with headroom left below full scale.
    expect(clip.peak).toBeGreaterThan(0.5 * 32767);
    expect(clip.peak).toBeLessThan(0.95 * 32767);
  });

  it('is a small asset, because it ships with the bundle', () => {
    expect(readFileSync(STEP_CLIP).byteLength).toBeLessThan(16 * 1024);
  });
});
