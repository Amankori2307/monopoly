import { useEffect, useRef, useState } from 'react';
import tokenStepSound from '../../../assets/audio/token-step.wav';
import {
  getMovementPath,
  getMovementSteps,
} from '../../../domain/board/tokenMovement.utils';
import { MoveDirection } from '../../../domain/types/game.enums';
import type { PlayerId, PlayerState } from '../../../domain/types/game.interfaces';
import { createSoundPool } from '../../../shared/utils/audio.utils';
import { playSound } from '../../../shared/utils/audio.utils';
import type { TokenPositions } from '../board/board.interfaces';
import {
  TOKEN_MIN_STEP_INTERVAL_MS,
  TOKEN_STEP_INTERVAL_MS,
  TOKEN_STEP_POOL_SIZE,
  TOKEN_STEP_VOLUME,
  TOKEN_WALK_BUDGET_MS,
  TOKEN_WALK_WATCHDOG_SLACK_MS,
} from '../diceDock.constants';

/** The hook's result, named and placed per docs/conventions.md section 5. */
interface UseAnimatedTokenPositionsResult {
  /** Where each token is being drawn right now, which lags the engine mid-walk. */
  positions: TokenPositions;
  /** True while any token is still walking to its space. */
  isMoving: boolean;
}

const positionsOf = (players: PlayerState[]): TokenPositions =>
  players.reduce<TokenPositions>((accumulator, player) => {
    accumulator[player.id] = player.position;
    return accumulator;
  }, {});

/**
 * Identity of where every player actually is. The effect keys off this rather
 * than the players array, which is rebuilt on every render - depending on the
 * array re-ran the walk on each of its own steps, stacking timers on top of the
 * pending ones and collapsing the animation into a single jump.
 */
const positionsKeyOf = (players: PlayerState[]) =>
  players.map((player) => `${player.id}:${player.position}`).join('|');

/**
 * How long each step takes, so a long walk does not become a long wait.
 *
 * A dice hop is short enough to keep the full interval; thirty-nine steps round
 * to GO would be seven seconds at that pace, so the interval shrinks to fit the
 * budget - never below the floor, where the steps stop being followable.
 */
const stepIntervalFor = (steps: number): number => {
  if (steps <= 0) {
    return TOKEN_STEP_INTERVAL_MS;
  }
  return Math.max(
    TOKEN_MIN_STEP_INTERVAL_MS,
    Math.min(TOKEN_STEP_INTERVAL_MS, Math.round(TOKEN_WALK_BUDGET_MS / steps))
  );
};

/**
 * Walks tokens to their new space one step at a time, ticking as they go.
 *
 * The engine moves a player in a single jump, so this keeps its own display
 * positions and catches up gradually. **Which way round the board it walks comes
 * from the engine**, as `player.lastMove` - it used to be inferred from the
 * position change, and an inference cannot tell "go back three spaces" from
 * thirty-seven forward. That guess also carried a twelve-space cap, so every
 * longer move snapped: "Advance to GO" teleported, and Go To Jail from a nearby
 * Chance space strolled in as though the player had rolled it.
 *
 * Every move is walked now. Only a token with no display position at all lands
 * immediately, which is mount and a game just loaded.
 */
export const useAnimatedTokenPositions = (
  players: PlayerState[]
): UseAnimatedTokenPositionsResult => {
  const displayRef = useRef<TokenPositions>(positionsOf(players));
  const [displayPositions, setDisplayPositions] = useState<TokenPositions>(
    displayRef.current
  );
  const poolRef = useRef<ReturnType<typeof createSoundPool> | null>(null);
  /** One pending timer per walking token, so cancelling one is exact. */
  const timersRef = useRef<Map<PlayerId, number>>(new Map());
  /** Forces every walk to settle, however the timers above have behaved. */
  const watchdogRef = useRef<number | null>(null);
  const positionsKey = positionsKeyOf(players);

  useEffect(() => {
    poolRef.current = createSoundPool(
      tokenStepSound,
      TOKEN_STEP_POOL_SIZE,
      TOKEN_STEP_VOLUME
    );
    // Captured on mount: the ref's own identity is stable, and reading
    // `.current` in the cleanup would read whatever a later render left there.
    const timers = timersRef.current;
    const pool = poolRef.current;

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      if (watchdogRef.current !== null) {
        window.clearTimeout(watchdogRef.current);
      }
      pool.stop();
    };
  }, []);

  useEffect(() => {
    // A newer move supersedes whatever was still walking. The walk below starts
    // from where the token is *now*, so a superseded one resumes rather than
    // skipping the ground it had not covered yet.
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }

    const current = displayRef.current;
    const settled: TokenPositions = { ...current };
    const walks: Array<{ playerId: PlayerId; path: number[]; interval: number }> = [];

    for (const player of players) {
      const from = current[player.id];
      const to = player.position;

      // A token with nowhere to walk from: a new player, or the first render.
      if (from === undefined) {
        settled[player.id] = to;
        continue;
      }

      // A save written before the engine recorded direction, and a player who
      // has not moved yet, both read as forward - which is every ordinary move.
      const direction = player.lastMove ?? MoveDirection.Forward;
      const path = getMovementPath(from, to, direction);
      if (path.length > 0) {
        walks.push({
          playerId: player.id,
          path,
          interval: stepIntervalFor(getMovementSteps(from, to, direction)),
        });
      }
    }

    displayRef.current = settled;
    setDisplayPositions(settled);

    /**
     * The last resort, because a walk that never ends is a game that cannot be
     * played: `isMoving` gates the Roll button and withholds every decision
     * modal, so a token stuck mid-walk leaves the player with nothing to click
     * and nothing on screen saying why. Whatever happens to the timers above,
     * this puts every token where the engine says it is and lets go.
     */
    if (walks.length > 0) {
      const longest = Math.max(...walks.map((walk) => walk.path.length * walk.interval));
      watchdogRef.current = window.setTimeout(() => {
        timersRef.current.forEach((timer) => window.clearTimeout(timer));
        timersRef.current.clear();
        // Snapping the positions is the whole rescue: isMoving is derived from
        // them, so it clears by itself once they agree with the engine.
        displayRef.current = positionsOf(players);
        setDisplayPositions(displayRef.current);
      }, longest + TOKEN_WALK_WATCHDOG_SLACK_MS);
    }

    /**
     * Steps are driven by the clock, not by counting timer callbacks.
     *
     * Two failure modes rule out the obvious approaches. Queueing every step up
     * front means they all come due together after a stall - and the main thread
     * is always busy right after a command (engine, validated save, whole board
     * re-render), which fired six steps in the same millisecond at the start of
     * every long walk. Chaining each step off the previous one fixes that but
     * hangs instead: a background tab throttles timers to about one a second, so
     * a thirty-nine step walk took thirty-nine seconds with the Roll button
     * disabled throughout, which reads as the game being stuck.
     *
     * Reading the position off elapsed time survives both. A tick that arrives
     * late advances the token as far as it should have got, and plays one tak
     * rather than a pile of them.
     */
    for (const walk of walks) {
      const startedAt = Date.now();
      let taken = 0;

      const tick = () => {
        const due = Math.min(
          walk.path.length,
          Math.floor((Date.now() - startedAt) / walk.interval)
        );

        if (due > taken) {
          taken = due;
          displayRef.current = {
            ...displayRef.current,
            [walk.playerId]: walk.path[taken - 1],
          };
          setDisplayPositions(displayRef.current);
          // One tak per tick, however many spaces this tick covered - the pool
          // is what lets consecutive taks overlap rather than cut each other off.
          playSound(poolRef.current?.next());
        }

        if (taken < walk.path.length) {
          timersRef.current.set(walk.playerId, window.setTimeout(tick, walk.interval));
          return;
        }
        timersRef.current.delete(walk.playerId);
      };

      timersRef.current.set(walk.playerId, window.setTimeout(tick, walk.interval));
    }

    // players is intentionally excluded: positionsKey is its meaningful identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey]);

  /**
   * Derived, not stored.
   *
   * A token drawn anywhere other than its engine position is a token still
   * walking - that *is* the definition, so there is nothing to keep in sync. It
   * used to be state set from the effect, and an effect runs after the paint: for
   * one frame the board had the new position while the flag still said settled,
   * so the decision modal flashed on screen before the walk started. It also
   * means the watchdog needs only to snap the positions; this follows.
   */
  const isMoving = players.some(
    (player) =>
      displayPositions[player.id] !== undefined &&
      displayPositions[player.id] !== player.position
  );

  return { positions: displayPositions, isMoving };
};
