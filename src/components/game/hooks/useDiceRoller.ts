import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError, logger } from '../../../shared/utils/logger.utils';
import { DIE_MAX, DIE_MIN } from '../../../domain/constants/game.constants';
import {
  DICE_ROLL_DURATION_MS,
  DICE_SHUFFLE_INTERVAL_MS,
  DICE_VOLUME,
} from '../diceDock.constants';

export interface UseDiceRollerOptions {
  canRoll: boolean;
  lastRoll: number[] | null;
  onRoll: () => void;
  soundSrc: string;
}

export interface UseDiceRollerResult {
  displayValues: [number, number];
  isRolling: boolean;
  roll: () => void;
}

const randomDie = () => Math.floor(Math.random() * (DIE_MAX - DIE_MIN + 1)) + DIE_MIN;

/**
 * Owns the dice animation: tumbling faces, the roll sound, and committing the
 * roll to the caller when the animation ends.
 *
 * Extracted from DiceDock so the timing and cleanup can be tested without
 * rendering, and so the component is markup only.
 */
export const useDiceRoller = ({
  canRoll,
  lastRoll,
  onRoll,
  soundSrc,
}: UseDiceRollerOptions): UseDiceRollerResult => {
  const [isRolling, setIsRolling] = useState(false);
  const [displayValues, setDisplayValues] = useState<[number, number]>([1, 1]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const shuffleTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    if (shuffleTimerRef.current !== null) {
      window.clearInterval(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
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

  // Settle on the engine's authoritative values once the tumble has finished.
  useEffect(() => {
    if (!isRolling && lastRoll?.length === 2) {
      setDisplayValues([lastRoll[0], lastRoll[1]]);
    }
  }, [isRolling, lastRoll]);

  const roll = useCallback(() => {
    if (!canRoll || isRolling) {
      return;
    }

    setIsRolling(true);
    setDisplayValues([randomDie(), randomDie()]);

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    }

    shuffleTimerRef.current = window.setInterval(() => {
      setDisplayValues([randomDie(), randomDie()]);
    }, DICE_SHUFFLE_INTERVAL_MS);

    commitTimerRef.current = window.setTimeout(() => {
      clearTimers();
      // The throw is contained rather than rethrown: letting it escape the timer
      // callback stops React committing the reset below, which is exactly how
      // the dock used to strand on "Rolling..." with the button disabled and no
      // way back. It is logged instead, so nothing is lost.
      try {
        onRoll();
      } catch (error) {
        logger.error('diceRoller', 'roll handler threw', describeError(error));
      } finally {
        setIsRolling(false);
      }
    }, DICE_ROLL_DURATION_MS);
  }, [canRoll, clearTimers, isRolling, onRoll]);

  return { displayValues, isRolling, roll };
};
