import { describe, expect, it } from 'vitest';
import { GameEventCue } from '../../domain/types/game.enums';
import type { GameEvent, GameState } from '../../domain/types/game.interfaces';
import { eventsSince, newestEventId } from './remoteEvents.utils';

/**
 * Feedback is built from what a command appended, which only the device that
 * ran it has. Without this a remote player watches the board change in silence.
 */

const event = (id: string): GameEvent => ({
  id,
  turnNumber: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  message: `event ${id}`,
  cue: GameEventCue.None,
});

/** History is newest-first, as the engine keeps it. */
const withHistory = (ids: string[]): GameState =>
  ({ history: ids.map(event) }) as GameState;

describe('eventsSince', () => {
  it('returns nothing for the first state from the table', () => {
    // Everything before you joined is backstory, not news - announcing it would
    // fire a toast per event for a game already in progress.
    expect(eventsSince(withHistory(['c', 'b', 'a']), null)).toEqual([]);
  });

  it('returns the events appended since the one we last saw', () => {
    const unseen = eventsSince(withHistory(['e', 'd', 'c', 'b', 'a']), 'c');

    // Newest-first, which is the order result.events comes in: toToasts
    // reverses it itself and cueForEvents reads [0] as the newest.
    expect(unseen.map((entry) => entry.id)).toEqual(['e', 'd']);
  });

  it('returns nothing when nothing has happened since', () => {
    expect(eventsSince(withHistory(['c', 'b', 'a']), 'c')).toEqual([]);
  });

  it('returns the whole history when the marker has aged out of it', () => {
    // The history is capped. A device away long enough for it to turn over
    // genuinely missed all of it, so all of it is news.
    const unseen = eventsSince(withHistory(['c', 'b', 'a']), 'long-gone');

    expect(unseen.map((entry) => entry.id)).toEqual(['c', 'b', 'a']);
  });

  it('copes with an empty history', () => {
    expect(eventsSince(withHistory([]), 'anything')).toEqual([]);
  });
});

describe('newestEventId', () => {
  it('is the head of the history, which is newest-first', () => {
    expect(newestEventId(withHistory(['c', 'b', 'a']))).toBe('c');
  });

  it('is null for a game that has not done anything yet', () => {
    expect(newestEventId(withHistory([]))).toBeNull();
  });
});
