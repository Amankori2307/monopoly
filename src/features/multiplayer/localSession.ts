import type { GameSession, PublishOutcome } from './gameSession.interfaces';

/**
 * The session a hot-seat game uses: it does nothing, successfully.
 *
 * This exists so there is one command path rather than two. `runGameCommand`
 * publishes unconditionally; for a local game that call resolves immediately,
 * touches nothing, and is dropped. The alternative - an `if (isOnline)` around
 * the publish - is the branch that eventually gets a bug on one side only.
 *
 * Every method is deliberately total: no throwing, no null-checks for callers,
 * no network. A local game must behave *identically* to how it did before the
 * seam existed, not merely equivalently.
 */
export const createLocalSession = (): GameSession => ({
  isOnline: false,
  // A hot-seat game is not a table anybody attaches to.
  gameId: null,

  publish: (): Promise<PublishOutcome> =>
    // Revision 0 forever: nothing reads it for a local game, and inventing a
    // counter would imply a shared history that does not exist.
    Promise.resolve({ status: 'accepted', revision: 0 }),

  // There is no elsewhere to fetch from.
  fetch: () => Promise.resolve(null),

  // Nobody to tell.
  announce: () => Promise.resolve(),

  // Everyone is here, by definition - they are all sharing this screen.
  onHere: () => () => undefined,

  // Nobody else can move, so the bell never rings. Returning a working
  // unsubscribe rather than a no-op keeps the caller's cleanup honest.
  subscribe: () => () => undefined,

  close: () => undefined,
});
