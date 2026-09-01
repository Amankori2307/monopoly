import { afterEach, describe, expect, it, vi } from 'vitest';
import { DefaultRandomSource, rollDie, SeededRandomSource, shuffle } from './rng';

/**
 * The foundation every deterministic test in this repo stands on.
 *
 * Untested until now, which was the worst place for a gap: if SeededRandomSource
 * stopped being deterministic, every suite that seeds it would keep passing and
 * stop meaning anything.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SeededRandomSource', () => {
  it('gives the same sequence for the same seed', () => {
    const draw = (seed: number) => {
      const source = new SeededRandomSource(seed);
      return Array.from({ length: 20 }, () => source.nextInt(1, 6));
    };

    expect(draw(7)).toEqual(draw(7));
  });

  it('gives different sequences for different seeds', () => {
    const first = new SeededRandomSource(1);
    const second = new SeededRandomSource(2);
    const draw = (source: SeededRandomSource) =>
      Array.from({ length: 20 }, () => source.nextInt(1, 6));

    expect(draw(first)).not.toEqual(draw(second));
  });

  it('advances, rather than repeating one value', () => {
    const source = new SeededRandomSource(3);
    const values = Array.from({ length: 30 }, () => source.nextInt(1, 6));

    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('stays inside the range it is asked for', () => {
    const source = new SeededRandomSource(11);

    for (let index = 0; index < 500; index += 1) {
      const value = source.nextInt(1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it('can reach both ends of the range', () => {
    const source = new SeededRandomSource(5);
    const values = new Set(Array.from({ length: 2000 }, () => source.nextInt(1, 6)));

    expect(values.has(1)).toBe(true);
    expect(values.has(6)).toBe(true);
    expect(values.size).toBe(6);
  });

  it('handles a single-value range', () => {
    const source = new SeededRandomSource(5);

    expect(source.nextInt(4, 4)).toBe(4);
  });

  it('handles a zero-based range, which is what shuffle asks for', () => {
    const source = new SeededRandomSource(9);
    const values = Array.from({ length: 200 }, () => source.nextInt(0, 39));

    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(39);
  });

  // The generator is a linear congruential one, so the state must stay inside
  // the modulus - a negative or overflowed seed would break the range maths.
  it('keeps its state positive over a long run', () => {
    const source = new SeededRandomSource(4294967295);

    for (let index = 0; index < 1000; index += 1) {
      expect(source.nextInt(1, 6)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('DefaultRandomSource', () => {
  it('stays inside the range', () => {
    const source = new DefaultRandomSource();

    for (let index = 0; index < 500; index += 1) {
      const value = source.nextInt(1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  // Math.random() returns [0, 1), so the top of the range is only reachable if
  // the span maths is right - an off-by-one here would silently never roll a 6.
  it('reaches the top of the range when Math.random is at its limit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);

    expect(new DefaultRandomSource().nextInt(1, 6)).toBe(6);
  });

  it('reaches the bottom of the range at zero', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(new DefaultRandomSource().nextInt(1, 6)).toBe(1);
  });
});

describe('rollDie', () => {
  it('always asks for one to six', () => {
    const nextInt = vi.fn().mockReturnValue(4);

    expect(rollDie({ nextInt })).toBe(4);
    expect(nextInt).toHaveBeenCalledWith(1, 6);
  });
});

describe('shuffle', () => {
  it('keeps every value, and only those values', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8];

    const shuffled = shuffle(values, new SeededRandomSource(3));

    expect([...shuffled].sort((a, b) => a - b)).toEqual(values);
  });

  it('does not mutate the array it was given', () => {
    const values = [1, 2, 3, 4, 5];

    shuffle(values, new SeededRandomSource(3));

    expect(values).toEqual([1, 2, 3, 4, 5]);
  });

  it('gives the same order for the same seed', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f'];

    expect(shuffle(values, new SeededRandomSource(5))).toEqual(
      shuffle(values, new SeededRandomSource(5))
    );
  });

  it('actually reorders a long enough list', () => {
    const values = Array.from({ length: 16 }, (_, index) => index);

    expect(shuffle(values, new SeededRandomSource(7))).not.toEqual(values);
  });

  it('copes with an empty list and a single value', () => {
    expect(shuffle([], new SeededRandomSource(1))).toEqual([]);
    expect(shuffle(['only'], new SeededRandomSource(1))).toEqual(['only']);
  });
});
