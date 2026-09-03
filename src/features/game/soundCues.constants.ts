import boughtSound from '../../assets/audio/bought.wav';
import builtSound from '../../assets/audio/built.wav';
import cardBadSound from '../../assets/audio/card-bad.wav';
import cardGoodSound from '../../assets/audio/card-good.wav';
import creditSound from '../../assets/audio/credit.wav';
import debitSound from '../../assets/audio/debit.wav';
import jailSound from '../../assets/audio/jail.wav';
import rentSound from '../../assets/audio/rent.wav';
import wonSound from '../../assets/audio/won.wav';
import { GameEventCue } from '../../domain/types/game.enums';

/**
 * Which clip each cue sounds. **The one place to change to swap a sound.**
 *
 * Four of these are placeholders where taste decides - see ATTRIBUTION.md.
 * Replacing one is this line plus a trim, and nothing else.
 *
 * `null` is deliberate rather than absent: a cue with no sound has been thought
 * about, and `soundCues.guard.test.ts` fails on a cue that is missing entirely.
 */
export const SOUND_FOR_CUE: Record<GameEventCue, string | null> = {
  [GameEventCue.Credit]: creditSound,
  [GameEventCue.Debit]: debitSound,
  [GameEventCue.Rent]: rentSound,
  [GameEventCue.Bought]: boughtSound,
  [GameEventCue.Built]: builtSound,
  [GameEventCue.Jailed]: jailSound,
  [GameEventCue.CardGood]: cardGoodSound,
  [GameEventCue.CardBad]: cardBadSound,
  [GameEventCue.Won]: wonSound,
  // A bankruptcy is already announced by the debt that caused it, and the game
  // is usually over a beat later - a second sting on top reads as a bug.
  [GameEventCue.Bankrupt]: debitSound,
  [GameEventCue.None]: null,
};

/**
 * Which cue wins when one command logs several.
 *
 * A card can leave three debts behind, and a bankruptcy settles a debt and ends
 * a game in the same breath. Playing all of them at once is noise, so the most
 * significant one sounds and the rest are left to the toasts. Most significant
 * first.
 */
export const CUE_PRIORITY: GameEventCue[] = [
  GameEventCue.Won,
  GameEventCue.Bankrupt,
  GameEventCue.Jailed,
  GameEventCue.Bought,
  GameEventCue.Built,
  GameEventCue.CardBad,
  GameEventCue.CardGood,
  GameEventCue.Rent,
  GameEventCue.Debit,
  GameEventCue.Credit,
];

/** How loud a cue sits next to the dice and the token steps. */
export const CUE_VOLUME = 0.4;
