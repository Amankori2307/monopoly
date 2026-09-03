import type { GameEvent } from '../../domain/types/game.interfaces';
import { GameEventCue } from '../../domain/types/game.enums';
import { CUE_PRIORITY, SOUND_FOR_CUE } from './soundCues.constants';

/**
 * The one cue a batch of events should sound.
 *
 * `GameCommandResult.events` is what a single command appended, and a command
 * can append several - a card that leaves three debts, or a bankruptcy that also
 * ends the game. Sounding each would be noise, so the most significant one wins
 * and the toasts carry the rest.
 *
 * Null when nothing in the batch is worth hearing, which is most turns.
 */
export const cueForEvents = (events: GameEvent[]): GameEventCue | null => {
  const present = new Set(events.map((event) => event.cue));
  const winner = CUE_PRIORITY.find((cue) => present.has(cue));

  // A cue with no clip behind it is the same as no cue.
  return winner && SOUND_FOR_CUE[winner] ? winner : null;
};
