import type { GameEvent } from '../../domain/types/game.interfaces';
import { GameEventTone } from '../../domain/types/game.enums';
import type {
  Toast,
  ToastTone,
} from '../../components/game/overlays/overlays.interfaces';

/**
 * The engine already writes a player-facing sentence for every action it logs,
 * so a toast is a history entry rather than a second message channel. That also
 * means feedback cannot drift from the game record - they are the same text.
 *
 * The tone comes with the event now. It used to be read back out of the wording
 * with regexes, which meant rephrasing a message silently changed its colour -
 * and any sentence containing "paid" was a debit whether money moved or not.
 */
const TOAST_TONES: Record<GameEventTone, ToastTone> = {
  [GameEventTone.Debit]: 'debit',
  [GameEventTone.Credit]: 'credit',
  [GameEventTone.Neutral]: 'neutral',
};

export const classifyEventTone = (event: GameEvent): ToastTone =>
  TOAST_TONES[event.tone] ?? 'neutral';

/** Oldest first, so a burst of events reads in the order it happened. */
export const toToasts = (events: GameEvent[]): Toast[] =>
  [...events].reverse().map((event) => ({
    id: event.id,
    message: event.message,
    tone: classifyEventTone(event),
  }));
