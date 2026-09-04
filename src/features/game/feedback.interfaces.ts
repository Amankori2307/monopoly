import type { Toast } from '../../components/game/overlays/overlays.interfaces';
import type { GameEventCue } from '../../domain/types/game.enums';

/**
 * A cue waiting to be sounded.
 *
 * The id is the event's, so two identical cues in a row are two sounds - keying
 * on the cue value alone would swallow the second.
 */
export interface PendingSoundCue {
  id: string;
  cue: GameEventCue;
}

/**
 * What a command has to say, held back until the move that caused it has played
 * out on the board.
 *
 * The engine resolves a whole turn in one synchronous step - roll, move, rent,
 * card and all - but the screen replays it in the order it happened. Feedback
 * queues here while the token walks and is released once it arrives, which is
 * the same rule that already withholds the decision modal.
 */
export interface PendingFeedback {
  /** Oldest first. Appended to, so a second command mid-walk loses nothing. */
  toasts: Toast[];
  /** One slot, so the newest cue wins. See queueFeedback. */
  cue: PendingSoundCue | null;
}
