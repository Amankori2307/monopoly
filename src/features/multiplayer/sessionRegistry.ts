import type { SessionRegistry } from './sessionRegistry.interfaces';
import { createLocalSession } from './localSession';

export type { SessionRegistry, ThunkExtra } from './sessionRegistry.interfaces';

/**
 * The one live session, reachable from a thunk.
 *
 * Reached through `thunk.extraArgument` rather than any of the alternatives:
 *
 * - Redux state is wrong: a session holds a socket and a timer, so it would
 *   trip `serializableCheck` and be meaningless in a devtools diff.
 * - Middleware is the wrong seam: every mutation is dispatched as a thunk, so
 *   middleware sees a function and would have to unwrap it to learn what the
 *   command was.
 * - A bare module singleton would be untestable - two tests in one file would
 *   share it - which is why this is a small mutable holder that `makeStore`
 *   owns rather than an exported `let`.
 *
 * A local game gets a `LocalSession`, so there is always a session and no
 * caller has to null-check.
 */
export const createSessionRegistry = (): SessionRegistry => {
  const registry: SessionRegistry = {
    current: createLocalSession(),
    replace(session) {
      registry.current.close();
      registry.current = session;
    },
    reset() {
      registry.replace(createLocalSession());
    },
  };

  return registry;
};
