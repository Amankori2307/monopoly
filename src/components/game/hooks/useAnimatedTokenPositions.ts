import { useEffect, useRef, useState } from 'react';
import tokenStepSound from '../../../assets/audio/playermove.wav';
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
  const [isMoving, setIsMoving] = useState(false);
  const poolRef = useRef<ReturnType<typeof createSoundPool> | null>(null);
  const timersRef = useRef<number[]>([]);
  const positionsKey = positionsKeyOf(players);

  useEffect(() => {
    poolRef.current = createSoundPool(
      tokenStepSound,
      TOKEN_STEP_POOL_SIZE,
      TOKEN_STEP_VOLUME
    );

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
      poolRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    // A newer move supersedes whatever was still walking. The walk below starts
    // from where the token is *now*, so a superseded one resumes rather than
    // skipping the ground it had not covered yet.
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    const current = displayRef.current;
    const settled: TokenPositions = { ...current };
    const steps: Array<{ playerId: PlayerId; space: number; delayMs: number }> = [];

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
      const distance = getMovementSteps(from, to, direction);
      const interval = stepIntervalFor(distance);

      getMovementPath(from, to, direction).forEach((space, stepIndex) => {
        steps.push({
          playerId: player.id,
          space,
          delayMs: (stepIndex + 1) * interval,
        });
      });
    }

    displayRef.current = settled;
    setDisplayPositions(settled);
    setIsMoving(steps.length > 0);

    for (const step of steps) {
      const timer = window.setTimeout(() => {
        displayRef.current = { ...displayRef.current, [step.playerId]: step.space };
        setDisplayPositions(displayRef.current);
        // Every step ticks, however fast the walk - the pool is what lets
        // consecutive taks overlap instead of cutting each other off.
        playSound(poolRef.current?.next());
      }, step.delayMs);
      timersRef.current.push(timer);
    }

    if (steps.length > 0) {
      // Settled once the last token finishes its final hop.
      const lastStepAt = Math.max(...steps.map((step) => step.delayMs));
      const settle = window.setTimeout(
        () => setIsMoving(false),
        lastStepAt + TOKEN_MIN_STEP_INTERVAL_MS
      );
      timersRef.current.push(settle);
    }
    // players is intentionally excluded: positionsKey is its meaningful identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey]);

  return { positions: displayPositions, isMoving };
};
