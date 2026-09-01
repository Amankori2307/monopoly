import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../domain/types/game.interfaces';
import { classifyEventTone, toToasts } from './toastFeed.utils';

const event = (id: string, message: string): GameEvent => ({
  id,
  turnNumber: 1,
  createdAt: '2026-08-31T00:00:00.000Z',
  message,
});

describe('classifyEventTone', () => {
  it.each([
    'Asha paid the bank ₹100 - Income Tax.',
    'Asha paid Vikram ₹35 - rent on Delhi.',
    'Asha bought Delhi for ₹350.',
    'Asha won the auction for Delhi at ₹200.',
  ])('reads money leaving a player as a debit: %s', (message) => {
    expect(classifyEventTone(message)).toBe('debit');
  });

  it.each(['Asha collected ₹200 - passing GO.', 'Asha collected ₹50 - Bank dividend.'])(
    'reads money arriving as a credit: %s',
    (message) => {
      expect(classifyEventTone(message)).toBe('credit');
    }
  );

  it('reads anything else as neutral', () => {
    expect(classifyEventTone('Asha rolled 3 and 5.')).toBe('neutral');
  });

  // "paid" is checked first on purpose: a rent sentence names both players, and
  // reading it as a credit would colour the payer's toast the wrong way.
  it('prefers debit when a message could read as both', () => {
    expect(classifyEventTone('Asha paid Vikram ₹35 and collected nothing.')).toBe(
      'debit'
    );
  });
});

describe('toToasts', () => {
  // Oldest first, so a burst of events reads in the order it happened.
  it('reverses the newest-first history into reading order', () => {
    const toasts = toToasts([event('b', 'second'), event('a', 'first')]);

    expect(toasts.map((toast) => toast.message)).toEqual(['first', 'second']);
  });

  it('carries the event id so the same event cannot toast twice', () => {
    expect(toToasts([event('a', 'Asha collected ₹200 - passing GO.')])).toEqual([
      { id: 'a', message: 'Asha collected ₹200 - passing GO.', tone: 'credit' },
    ]);
  });
});
