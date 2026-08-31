import type { GameEvent } from '../../domain/types/game.interfaces';
import type {
  Toast,
  ToastTone,
} from '../../components/game/overlays/overlays.interfaces';

/**
 * The engine already writes a player-facing sentence for every action it logs,
 * so a toast is a history entry rather than a second message channel. That also
 * means feedback cannot drift from the game record - they are the same text.
 */

/** Money leaving a player. Ordered before credit so "paid" wins over "collect". */
const DEBIT_PATTERNS = [/\bpaid\b/i, /\bbought\b/i, /\bwon the auction\b/i, /\bbid\b/i];
const CREDIT_PATTERNS = [/\bcollected\b/i, /\breceived\b/i];

export const classifyEventTone = (message: string): ToastTone => {
  if (DEBIT_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'debit';
  }
  if (CREDIT_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'credit';
  }
  return 'neutral';
};

/**
 * The events a command just appended.
 *
 * History is newest-first and capped, so the delta is the leading slice. Do not
 * use GameCommandResult.events for this - it returns the whole history, not what
 * changed (see CLAUDE.md section 8).
 */
export const selectNewEvents = (
  previousHistory: GameEvent[],
  nextHistory: GameEvent[]
): GameEvent[] => {
  const added = nextHistory.length - previousHistory.length;
  if (added <= 0) {
    // The cap was already reached, so length cannot grow. Fall back to the ids
    // we have not seen, which keeps feedback working late in a long game.
    const seen = new Set(previousHistory.map((event) => event.id));
    return nextHistory.filter((event) => !seen.has(event.id));
  }
  return nextHistory.slice(0, added);
};

/** Oldest first, so a burst of events reads in the order it happened. */
export const toToasts = (events: GameEvent[]): Toast[] =>
  [...events].reverse().map((event) => ({
    id: event.id,
    message: event.message,
    tone: classifyEventTone(event.message),
  }));
