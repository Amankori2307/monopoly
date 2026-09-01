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

/** Oldest first, so a burst of events reads in the order it happened. */
export const toToasts = (events: GameEvent[]): Toast[] =>
  [...events].reverse().map((event) => ({
    id: event.id,
    message: event.message,
    tone: classifyEventTone(event.message),
  }));
