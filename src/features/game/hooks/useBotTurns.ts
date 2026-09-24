import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { chooseBotCommand } from '../../../domain/ai/botPolicy';
import { TableMode } from '../../../domain/types/game.enums';
import type { GameState } from '../../../domain/types/game.interfaces';
import { runGameCommand } from '../gameSlice';
import { BOT_MOVE_DELAY_MS } from '../game.constants';

/**
 * Plays the bots' moves, one at a time, at a pace a person can follow.
 *
 * The policy is pure and lives in `domain/ai`; this is the whole of the part
 * that is not. It decides only WHEN to ask, and everything it does goes through
 * `runGameCommand` - the same thunk a click goes through - so a bot's move is
 * saved, published, sounded and toasted exactly like a person's, with no second
 * path to keep in step.
 *
 * Three things gate it, and each is a bug that happened without it:
 *
 * - **`isMoving`.** The engine resolves a whole turn synchronously and the
 *   board then spends up to a couple of seconds walking the token. Asking again
 *   before that clears makes a bot play its next move over its own animation,
 *   and a four-bot game is a blur of nothing legible. It is the same flag that
 *   already withholds the decision modal and the feedback queue.
 * - **A delay.** With none, a bot's whole turn lands in one frame and the only
 *   evidence it happened is the history. The point of watching an opponent is
 *   seeing what they did.
 * - **Hot seat only.** A bot has no device, so on an online table there is no
 *   answer to "which client sends its commands" that does not make one of them
 *   an authority over the game - which `docs/features/multiplayer.md` records as
 *   a decision not to take. The lobby cannot create a bot, so this is a belt to
 *   that: a bot arriving in an online state is left alone rather than driven by
 *   every device at once.
 */
export const useBotTurns = (game: GameState | null, isMoving: boolean): void => {
  const dispatch = useAppDispatch();
  /**
   * The move this hook has already SENT - not the one it has scheduled.
   *
   * `runGameCommand` is async (it saves and publishes), so an effect that re-ran
   * before the store updated would send the same command twice, and in an
   * auction that is two bids from one bidder. Keying on the state the command
   * was chosen from makes it once-per-state rather than once-per-render.
   *
   * Marking it at SCHEDULE time instead is a deadlock, and a total one. React
   * StrictMode double-invokes an effect on mount - setup, cleanup, setup - so
   * the cleanup cancelled the pending timer and the second setup, seeing its own
   * mark, returned without scheduling another. Nothing was ever dispatched.
   *
   * It only bites when a bot is active on the FIRST render, because StrictMode
   * doubles the mount and not later dep changes - which is to say: exactly when
   * a bot wins the opening roll, in a solo game, on the first screen a player
   * sees. Every test passed, because `renderWithProviders` mounts no StrictMode
   * and the e2e journey happened to play a human turn first.
   */
  const sentFor = useRef<string | null>(null);

  const isHotSeat = game?.tableMode === TableMode.HotSeat;

  useEffect(() => {
    if (!game || !isHotSeat || isMoving) {
      return;
    }
    const command = chooseBotCommand(game);
    if (!command) {
      // Not a bot's move, the game is over, or - the one that matters - a
      // decision no command answers. `selectHasAvailableAction` is the oracle
      // for the last case and logs it loudly; there is nothing useful to do
      // here but stop, which is what a person at this table would also face.
      return;
    }

    // `updatedAt` moves on every command the engine accepts, so it identifies
    // the state this decision was made from without reading the revision, which
    // a hot-seat game does not bump.
    const key = `${game.updatedAt}:${command.type}`;
    if (sentFor.current === key) {
      return;
    }

    const timer = window.setTimeout(() => {
      // Marked here, on the way out, so a cancelled timer leaves nothing behind
      // and the next run of this effect is free to schedule again.
      sentFor.current = key;
      void dispatch(runGameCommand(command));
    }, BOT_MOVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [dispatch, game, isHotSeat, isMoving]);
};
