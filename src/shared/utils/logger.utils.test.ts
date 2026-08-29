import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLog,
  describeError,
  getLogEntries,
  getLogErrors,
  LOG_STORAGE_KEY,
  LogLevel,
  logger,
  MAX_LOG_ENTRIES,
} from './logger.utils';

beforeEach(() => {
  clearLog();
  window.localStorage.clear();
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('logger', () => {
  it('records an entry with scope, level, and context', () => {
    logger.error('gameCommand', 'rollTurnDice rejected', { phase: 'await_roll' });

    const [entry] = getLogEntries();
    expect(entry.scope).toBe('gameCommand');
    expect(entry.level).toBe(LogLevel.Error);
    expect(entry.message).toBe('rollTurnDice rejected');
    expect(entry.context).toEqual({ phase: 'await_roll' });
    expect(entry.at).toBeTruthy();
  });

  it('filters errors from other levels', () => {
    logger.info('a', 'fine');
    logger.warn('b', 'hmm');
    logger.error('c', 'broken');

    expect(getLogEntries()).toHaveLength(3);
    expect(getLogErrors().map((entry) => entry.message)).toEqual(['broken']);
  });

  // The log must not grow without bound in a long game.
  it('caps the ring at MAX_LOG_ENTRIES, keeping the newest', () => {
    for (let index = 0; index < MAX_LOG_ENTRIES + 20; index += 1) {
      logger.info('loop', `entry ${index}`);
    }

    const entries = getLogEntries();
    expect(entries).toHaveLength(MAX_LOG_ENTRIES);
    expect(entries[entries.length - 1].message).toBe(`entry ${MAX_LOG_ENTRIES + 19}`);
  });

  // Survives a reload, which is when a stuck-state report usually arrives.
  it('persists to localStorage', () => {
    logger.error('gameCommand', 'boom');

    const stored = JSON.parse(window.localStorage.getItem(LOG_STORAGE_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].message).toBe('boom');
  });

  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => logger.info('scope', 'still fine')).not.toThrow();
  });

  it('clears', () => {
    logger.info('scope', 'one');
    clearLog();

    expect(getLogEntries()).toEqual([]);
  });
});

describe('describeError', () => {
  it('pulls message and stack from an Error', () => {
    const described = describeError(new Error('nope'));

    expect(described.message).toBe('nope');
    expect(described.stack).toContain('nope');
  });

  it('stringifies a non-Error', () => {
    expect(describeError('plain string').message).toBe('plain string');
    expect(describeError(42).message).toBe('42');
  });
});
