import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { releaseFeedback } from '../uiSlice';

/**
 * Holds a command's feedback back until the move that caused it has finished.
 *
 * The engine resolves a turn in a single synchronous step - roll, move, rent,
 * card, bankruptcy and all - and the thunk queues everything it said. The board
 * then takes up to a couple of seconds to walk the token there. Showing the
 * queue immediately announced the outcome before the move: "paid ₹250 rent"
 * appeared while the token was still three spaces short of the site.
 *
 * So the screen replays what the engine decided, in the order it happened. This
 * is the same rule that already withholds the decision modal (`isMoving` in
 * GameOverlayLayer), applied to the other two feedback channels - the toasts and
 * the cue sound, which share a batch and must stay together.
 *
 * Liveness is not this hook's problem to solve: `isMoving` is derived from the
 * drawn positions, and `useAnimatedTokenPositions` has a watchdog that snaps
 * every token to its engine position. A broken walk therefore still clears the
 * flag, and the queue still drains.
 */
export const useFeedbackGate = (isMoving: boolean): void => {
  const dispatch = useAppDispatch();
  const hasPending = useAppSelector(
    (state) =>
      state.ui.pendingFeedback.toasts.length > 0 || state.ui.pendingFeedback.cue !== null
  );

  useEffect(() => {
    if (isMoving || !hasPending) {
      return;
    }
    dispatch(releaseFeedback());
  }, [dispatch, hasPending, isMoving]);
};
