import { describe, expect, it } from 'vitest';
import { GameEventCue } from '../../domain/types/game.enums';
import type { GameEvent } from '../../domain/types/game.interfaces';
import { classifyEventTone, toToasts } from './toastFeed.utils';

const event = (
  id: string,
  message: string,
  cue: GameEventCue = GameEventCue.None
): GameEvent => ({
  id,
  turnNumber: 1,
  createdAt: '2026-08-31T00:00:00.000Z',
  message,
  cue,
});

/**
 * The tone comes with the event now. It used to be read back out of the wording,
 * which meant rephrasing a message silently changed its colour - and any
 * sentence containing "paid" was a debit whether money moved or not.
 */
describe('classifyEventTone', () => {
  it.each([
    [GameEventCue.Debit, 'debit'],
    [GameEventCue.Credit, 'credit'],
    [GameEventCue.None, 'neutral'],
  ])('maps %s to the %s toast', (tone, expected) => {
    expect(classifyEventTone(event('a', 'anything', tone))).toBe(expected);
  });

  // The wording is for players, not for parsing: a sentence naming both sides
  // of a payment used to be read by keyword and could land either way.
  it('ignores the wording entirely', () => {
    const misleading = event(
      'a',
      'Asha paid Vikram ₹35 and collected nothing.',
      GameEventCue.Credit
    );

    expect(classifyEventTone(misleading)).toBe('credit');
  });

  it('falls back to neutral on a tone it does not know', () => {
    const unknown = { ...event('a', 'from the future'), tone: 'sideways' };

    expect(classifyEventTone(unknown as unknown as GameEvent)).toBe('neutral');
  });
});

describe('toToasts', () => {
  // Oldest first, so a burst of events reads in the order it happened.
  it('reverses the newest-first history into reading order', () => {
    const toasts = toToasts([event('b', 'second'), event('a', 'first')]);

    expect(toasts.map((toast) => toast.message)).toEqual(['first', 'second']);
  });

  it('carries the event id so the same event cannot toast twice', () => {
    const collected = event(
      'a',
      'Asha collected ₹200 - passing GO.',
      GameEventCue.Credit
    );

    expect(toToasts([collected])).toEqual([
      { id: 'a', message: 'Asha collected ₹200 - passing GO.', tone: 'credit' },
    ]);
  });
});
