import { useEffect, useRef, useState } from 'react';
import { DICE_ROLL_DURATION_MS } from '../diceDock.constants';

/**
 * True while a throw is being animated anywhere on this screen.
 *
 * The dock owns its own tumble, but the board needs the same window: the engine
 * has already moved the player by the time the faces start spinning, so the
 * token has to be held or it arrives before the dice show what sent it there.
 *
 * Derived from `lastRollId` and `DICE_ROLL_DURATION_MS` - the same id and the
 * same constant the dock uses - rather than lifted out of the dock's state.
 * Passing it down would mean the board waiting on a child's internals, and the
 * Jail panel has a second dock of its own, so there is no single child to ask.
 *
 * Never latches: whatever happens, it clears after one duration, and the walk's
 * own watchdog is armed while it is held.
 */
export const useIsRollingDice = (lastRollId: string | null): boolean => {
  const [isRolling, setIsRolling] = useState(false);
  const seenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (seenRef.current === undefined) {
      // First render. Whatever is on screen is history, not a new throw.
      seenRef.current = lastRollId;
      return;
    }
    if (lastRollId === null || lastRollId === seenRef.current) {
      return;
    }
    seenRef.current = lastRollId;
    setIsRolling(true);

    const timer = window.setTimeout(() => setIsRolling(false), DICE_ROLL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [lastRollId]);

  return isRolling;
};
