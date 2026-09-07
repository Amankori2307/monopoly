import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound } from '../../../shared/utils/audio.utils';
import { describeError, logger } from '../../../shared/utils/logger.utils';
import { DIE_MAX, DIE_MIN } from '../../../domain/constants/game.constants';
import {
  DICE_ROLL_DURATION_MS,
  DICE_SHUFFLE_INTERVAL_MS,
  DICE_SUBMIT_WATCHDOG_MS,
  DICE_VOLUME,
} from '../diceDock.constants';

export interface UseDiceRollerOptions {
  canRoll: boolean;
  lastRoll: number[] | null;
  /**
   * Identifies the throw. A change is what starts the tumble, on every device -
   * including the one that did not click.
   */
  lastRollId: string | null;
  onRoll: () => void;
  /** False when the player has muted the game. The tumble still runs. */
  soundEnabled?: boolean;
  soundSrc: string;
}

export interface UseDiceRollerResult {
  displayValues: [number, number];
  /** True while the faces are tumbling. Every device, not just the roller. */
  isRolling: boolean;
  /** True while this device is waiting for its own roll to land. */
  isSubmitting: boolean;
  roll: () => void;
}

const randomDie = () => Math.floor(Math.random() * (DIE_MAX - DIE_MIN + 1)) + DIE_MIN;

/**
 * Owns the dice animation: tumbling faces, the roll sound, and settling on the
 * throw the engine actually made.
 *
 * **The tumble runs after the commit, not before it.** It used to be the other
 * way round: the click animated for 520ms and only then told the engine. In one
 * browser that reads fine, because the only person who can click is the person
 * watching. With a seat per device it is wrong twice - the other players see the
 * faces snap to a result with no throw at all, and the roller is watching an
 * animation of a roll that has not happened yet, so a refusal arrives after the
 * dice have already "landed".
 *
 * Keying the tumble on `turn.lastRollId` instead means every device replays the
 * same authoritative throw exactly once. Deriving it from `history[0].id` would
 * not work: that changes on every command rather than every roll, so the dice
 * would re-tumble on an unrelated move - and matching the history's wording is
 * the regex trap CLAUDE.md section 8 records as fixed once already.
 *
 * `isRolling` and `isSubmitting` are separate on purpose. The first is the
 * animation and is true everywhere; the second is this device's own
 * double-submit lock. Conflating them would either let a second click through
 * while the first was in flight, or leave every spectator's button disabled for
 * a reason that has nothing to do with them.
 */
export const useDiceRoller = ({
  canRoll,
  lastRoll,
  lastRollId,
  onRoll,
  soundEnabled = true,
  soundSrc,
}: UseDiceRollerOptions): UseDiceRollerResult => {
  const [isRolling, setIsRolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayValues, setDisplayValues] = useState<[number, number]>([1, 1]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  /**
   * The throw already on screen when this hook mounted.
   *
   * Without it, opening a saved game mid-turn would tumble the dice for a roll
   * that happened before the page was even loaded.
   */
  const seenRollIdRef = useRef<string | null | undefined>(undefined);

  const clearTimers = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (shuffleTimerRef.current !== null) {
      window.clearInterval(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(soundSrc);
    audioRef.current.volume = DICE_VOLUME;

    return () => {
      clearTimers();
      audioRef.current?.pause();
    };
  }, [clearTimers, soundSrc]);

  // A new throw: tumble, then settle on what the engine rolled. Runs on every
  // device, which is what makes the roller and the watchers see one animation.
  useEffect(() => {
    if (seenRollIdRef.current === undefined) {
      // First render. Whatever is showing is history, not a new throw.
      seenRollIdRef.current = lastRollId;
      return;
    }
    if (lastRollId === null || lastRollId === seenRollIdRef.current) {
      return;
    }
    seenRollIdRef.current = lastRollId;

    // Our own command landed; the lock can go whether or not we threw it.
    setIsSubmitting(false);
    setIsRolling(true);
    setDisplayValues([randomDie(), randomDie()]);

    // The sound is decoration and must never be able to stop the roll.
    // `play()` does not return a promise everywhere - jsdom returns undefined,
    // and so did older Safari - so `.catch()` on it threw synchronously.
    if (soundEnabled) {
      playSound(audioRef.current);
    }

    shuffleTimerRef.current = window.setInterval(() => {
      setDisplayValues([randomDie(), randomDie()]);
    }, DICE_SHUFFLE_INTERVAL_MS);

    settleTimerRef.current = window.setTimeout(() => {
      clearTimers();
      setIsRolling(false);
    }, DICE_ROLL_DURATION_MS);

    return clearTimers;
  }, [clearTimers, lastRollId, soundEnabled]);

  // Settle on the engine's authoritative values once the tumble has finished.
  //
  // Keyed on the faces rather than the array, because `lastRoll` is a fresh
  // array on every render for any caller that builds it inline - and this
  // effect sets state, so depending on its identity is an infinite loop.
  const lastRollKey = lastRoll?.length === 2 ? `${lastRoll[0]},${lastRoll[1]}` : null;
  useEffect(() => {
    if (isRolling || lastRollKey === null) {
      return;
    }
    const [first, second] = lastRollKey.split(',').map(Number);
    setDisplayValues([first, second]);
  }, [isRolling, lastRollKey]);

  const roll = useCallback(() => {
    if (!canRoll || isRolling || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    // Synchronous, and before any animation: the engine decides the throw, and
    // the effect above animates whatever it decided.
    try {
      onRoll();
    } catch (error) {
      // Contained rather than rethrown - letting it escape would strand the
      // button on "Rolling..." with no way back, which is the failure this hook
      // has already been fixed for once.
      logger.error('diceRoller', 'roll handler threw', describeError(error));
      setIsSubmitting(false);
      return;
    }

    // If the command was refused, or the publish never came back, no new roll
    // id will arrive and the lock would hold forever. The engine is synchronous,
    // so this only ever fires on a genuine dead end.
    watchdogRef.current = window.setTimeout(() => {
      setIsSubmitting(false);
    }, DICE_SUBMIT_WATCHDOG_MS);
  }, [canRoll, isRolling, isSubmitting, onRoll]);

  return { displayValues, isRolling, isSubmitting, roll };
};
