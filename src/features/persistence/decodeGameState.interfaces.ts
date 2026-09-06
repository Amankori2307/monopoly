import type { GameState } from '../../domain/types/game.interfaces';

/** A decoded game, and whether the input was behind the current version. */
export interface DecodedGameState {
  game: GameState;
  /** True when migrations ran, so a caller can decide to write the result back. */
  wasBehind: boolean;
}
