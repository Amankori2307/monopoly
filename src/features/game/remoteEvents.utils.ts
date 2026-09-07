import type { GameEvent, GameState } from '../../domain/types/game.interfaces';

/**
 * What happened in a game state that arrived from another device.
 *
 * Toasts and the sound cue are built from `result.events` - what *this*
 * command appended - which only the device that ran the command has. A remote
 * player would otherwise watch the board change in silence, with no toast, no
 * cue, and no idea what just cost them rent.
 *
 * `history` is newest-first and capped, so the events since a known point are a
 * prefix scan: walk from the newest until an id we have already seen, and
 * everything passed is new. Returned newest-first, which is the order
 * `result.events` comes in - `toToasts` reverses it itself, and `cueForEvents`
 * reads `[0]` as the newest. Handing it oldest-first would silently invert
 * every toast burst and pick the wrong event's cue.
 *
 * Capped at the history length by construction. A device that was away long
 * enough for the whole history to turn over gets the whole history - which is
 * the right answer, since it genuinely missed all of it - and the toast stack
 * has its own limit.
 */
export const eventsSince = (game: GameState, seenEventId: string | null): GameEvent[] => {
  if (seenEventId === null) {
    // First state from the table: everything before now is backstory, not news.
    return [];
  }

  const unseen: GameEvent[] = [];
  for (const event of game.history) {
    if (event.id === seenEventId) {
      break;
    }
    unseen.push(event);
  }

  return unseen;
};

/** The newest event's id, to remember as the high-water mark. */
export const newestEventId = (game: GameState): string | null =>
  game.history[0]?.id ?? null;
