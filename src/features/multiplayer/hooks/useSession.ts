import { useStore } from 'react-redux';
import { useAppSelector } from '../../../app/hooks';
import type { GameSession } from '../gameSession.interfaces';
import type { ThunkExtra } from '../sessionRegistry.interfaces';

/**
 * The live session, for a component that needs to subscribe to it.
 *
 * Reached through the store's thunk argument rather than React state, because a
 * session holds a socket: it is not serialisable and has no business in a
 * devtools diff.
 *
 * `sessionEpoch` is what makes this correct rather than merely convenient. The
 * registry is a plain mutable holder, so replacing the session re-renders
 * nothing - an effect that subscribed on the first render stayed attached to
 * the LOCAL session and never heard a bell. That is exactly what happened: the
 * host opened a table, never joined its own channel, and sat watching an empty
 * lobby while the guest was already seated.
 */
export const useSession = (): GameSession => {
  const store = useStore();
  // Subscribed to purely for the re-render. The value itself is not used.
  useAppSelector((state) => state.seat.sessionEpoch);

  const extra = (store as unknown as { dispatch: (thunk: unknown) => unknown }).dispatch(
    (_d: unknown, _g: unknown, thunkExtra: ThunkExtra) => thunkExtra
  ) as ThunkExtra;

  return extra.session.current;
};
