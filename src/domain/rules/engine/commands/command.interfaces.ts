import type { GameCommandType } from '../../../types/game.enums';
import type { GameState, RuntimeGameCommand } from '../../../types/game.interfaces';
import type { RandomSource } from '../../rng';

/**
 * One handler per command: state in, state out.
 *
 * The mapped type is what makes the split safe. Each key gets the command
 * narrowed to its own variant, so a handler registered under `buildHouse`
 * cannot read a field only `proposeTrade` has — which a single
 * `(state, command)` signature would have allowed.
 *
 * Handlers are grouped by area into the modules beside this one, and
 * `executeGameCommand` is the one place they are merged and dispatched.
 */
export type CommandHandlers = {
  [K in GameCommandType]?: (
    state: GameState,
    command: Extract<RuntimeGameCommand, { type: K }>,
    randomSource: RandomSource
  ) => GameState;
};
