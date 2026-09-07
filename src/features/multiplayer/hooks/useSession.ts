import { useStore } from 'react-redux';
import type { GameSession } from '../gameSession.interfaces';
import type { ThunkExtra } from '../sessionRegistry.interfaces';

/**
 * The live session, for a component that needs to subscribe to it.
 *
 * Reached through the store's thunk argument rather than through React state,
 * because a session holds a socket - it is not serialisable and has no business
 * in a devtools diff. `useStore` is stable, so this does not re-render.
 */
export const useSession = (): GameSession => {
  const store = useStore();
  const extra = (store as unknown as { dispatch: (thunk: unknown) => unknown }).dispatch(
    (_d: unknown, _g: unknown, thunkExtra: ThunkExtra) => thunkExtra
  ) as ThunkExtra;

  return extra.session.current;
};
