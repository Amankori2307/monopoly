import type { GameEvent } from '../../domain/types/game.interfaces';
import { GameEventCue } from '../../domain/types/game.enums';
import type {
  Toast,
  ToastTone,
} from '../../components/game/overlays/overlays.interfaces';

/**
 * The engine already writes a player-facing sentence for every action it logs,
 * so a toast is a history entry rather than a second message channel. That also
 * means feedback cannot drift from the game record - they are the same text.
 *
 * The cue comes with the event. It used to be read back out of the wording with
 * regexes, which meant rephrasing a message silently changed its colour - and
 * any sentence containing "paid" was a debit whether money moved or not.
 *
 * A toast has three colours and the cue has ten values, because the cue also
 * decides the sound. This map is the narrowing, in one place.
 */
const TOAST_TONES: Record<GameEventCue, ToastTone> = {
  [GameEventCue.Credit]: 'credit',
  [GameEventCue.Debit]: 'debit',
  [GameEventCue.Rent]: 'debit',
  [GameEventCue.Bankrupt]: 'debit',
  [GameEventCue.CardBad]: 'debit',
  [GameEventCue.Bought]: 'credit',
  [GameEventCue.Built]: 'credit',
  [GameEventCue.Won]: 'credit',
  [GameEventCue.CardGood]: 'credit',
  [GameEventCue.Jailed]: 'neutral',
  [GameEventCue.None]: 'neutral',
};

export const classifyEventTone = (event: GameEvent): ToastTone =>
  TOAST_TONES[event.cue] ?? 'neutral';

/** Oldest first, so a burst of events reads in the order it happened. */
export const toToasts = (events: GameEvent[]): Toast[] =>
  [...events].reverse().map((event) => ({
    id: event.id,
    message: event.message,
    tone: classifyEventTone(event),
  }));
