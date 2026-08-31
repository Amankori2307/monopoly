import { useEffect, useRef, useState } from 'react';
import tokenStepSound from '../../../assets/audio/playermove.wav';
import {
  getMovementPath,
  isWalkableMove,
} from '../../../domain/board/tokenMovement.utils';
import type { PlayerId, PlayerState } from '../../../domain/types/game.interfaces';
import type { TokenPositions } from '../board/board.interfaces';
import { TOKEN_STEP_INTERVAL_MS, TOKEN_STEP_VOLUME } from '../diceDock.constants';

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
 * Walks tokens to their new space one step at a time, ticking as they go.
 *
 * The engine moves a player in a single jump, so this keeps its own display
 * positions and catches up gradually. Only dice-sized hops are walked; a
 * teleport (Go To Jail, advance to GO) snaps, because walking it would
 * misrepresent what happened - see tokenMovement.utils.
 */
export const useAnimatedTokenPositions = (
  players: PlayerState[]
): UseAnimatedTokenPositionsResult => {
  const displayRef = useRef<TokenPositions>(positionsOf(players));
  const [displayPositions, setDisplayPositions] = useState<TokenPositions>(
    displayRef.current
  );
  const [isMoving, setIsMoving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const positionsKey = positionsKeyOf(players);

  useEffect(() => {
    audioRef.current = new Audio(tokenStepSound);
    audioRef.current.volume = TOKEN_STEP_VOLUME;

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    // A newer move supersedes whatever was still walking.
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    const current = displayRef.current;
    const settled: TokenPositions = { ...current };
    const steps: Array<{ playerId: PlayerId; space: number; delayMs: number }> = [];

    for (const player of players) {
      const from = current[player.id];
      const to = player.position;

      // New player, or a teleport: land immediately.
      if (from === undefined || !isWalkableMove(from, to)) {
        settled[player.id] = to;
        continue;
      }

      getMovementPath(from, to).forEach((space, stepIndex) => {
        steps.push({
          playerId: player.id,
          space,
          delayMs: (stepIndex + 1) * TOKEN_STEP_INTERVAL_MS,
        });
      });
    }

    displayRef.current = settled;
    setDisplayPositions(settled);
    setIsMoving(steps.length > 0);

    const playStep = () => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    };

    for (const step of steps) {
      const timer = window.setTimeout(() => {
        displayRef.current = { ...displayRef.current, [step.playerId]: step.space };
        setDisplayPositions(displayRef.current);
        playStep();
      }, step.delayMs);
      timersRef.current.push(timer);
    }

    if (steps.length > 0) {
      // Settled once the last token finishes its final hop.
      const lastStepAt = Math.max(...steps.map((step) => step.delayMs));
      const settle = window.setTimeout(
        () => setIsMoving(false),
        lastStepAt + TOKEN_STEP_INTERVAL_MS
      );
      timersRef.current.push(settle);
    }
    // players is intentionally excluded: positionsKey is its meaningful identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey]);

  return { positions: displayPositions, isMoving };
};
