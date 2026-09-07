import { logger } from '../../shared/utils/logger.utils';
import type { Doorbell } from './doorbell.interfaces';
import type { OnlineConfig } from './onlineConfig.interfaces';

export type { Doorbell } from './doorbell.interfaces';

/**
 * "Somebody moved" - a revision number and nothing else.
 *
 * Broadcast rather than `postgres_changes`, and the reason is the access
 * control. Realtime evaluates RLS before it forwards a row change, and `games`
 * deliberately has RLS on with **no** policies - so a postgres_changes channel
 * subscribed happily and then delivered nothing at all. Verified against the
 * live project before this was written.
 *
 * Making postgres_changes work would mean granting anon SELECT plus a
 * permissive policy, which is exactly the hole the whole RPC design exists to
 * close: an unfiltered `GET /rest/v1/games` would list every game anyone ever
 * created.
 *
 * Broadcast touches no table, so it needs neither. The bell carries only a
 * revision; the state still comes from `fetch_game`, which requires the join
 * code - so a spoofed bell costs one redundant fetch and discloses nothing.
 */

/** The one event this app sends, and the only one it listens for. */
const BELL_EVENT = 'revision';

/** A channel, described by what is used rather than imported from the library. */
interface BroadcastChannel {
  send: (message: {
    type: 'broadcast';
    event: string;
    payload: { revision: number };
  }) => unknown;
  unsubscribe: () => unknown;
}

export const createDoorbell = (config: OnlineConfig, gameId: string): Doorbell => {
  const listeners = new Set<(revision: number) => void>();
  let channel: BroadcastChannel | null = null;
  let disconnect: (() => void) | null = null;
  let ready: Promise<void> | null = null;
  let closed = false;

  /** Joins the topic once. The library is dynamic, so an offline player
   *  downloads none of it. */
  const ensureChannel = (): Promise<void> => {
    ready ??= import('@supabase/realtime-js')
      .then((realtime) => {
        if (closed) {
          return;
        }
        const client = new realtime.RealtimeClient(`${config.url}/realtime/v1`, {
          params: { apikey: config.anonKey },
        });
        channel = client
          .channel(`game:${gameId}`)
          .on('broadcast', { event: BELL_EVENT }, (message: { payload?: unknown }) => {
            const revision = (message.payload as { revision?: unknown })?.revision;
            if (typeof revision === 'number') {
              listeners.forEach((listener) => listener(revision));
            }
          })
          .subscribe() as unknown as BroadcastChannel;
        disconnect = () => client.disconnect();
      })
      .catch((error) => {
        // Cleared so a later ring can retry. The session's poll keeps the game
        // moving meanwhile - slow rather than stuck.
        ready = null;
        logger.error('multiplayer', 'realtime unavailable, polling instead', {
          error: String(error),
        });
      });

    return ready;
  };

  return {
    onRing(listener) {
      listeners.add(listener);
      void ensureChannel();
      return () => listeners.delete(listener);
    },

    async ring(revision) {
      try {
        await ensureChannel();
        await channel?.send({
          type: 'broadcast',
          event: BELL_EVENT,
          payload: { revision },
        });
      } catch (error) {
        // Never fatal: the move is stored, and the others will poll.
        logger.error('multiplayer', 'could not ring the doorbell', {
          error: String(error),
        });
      }
    },

    close() {
      closed = true;
      listeners.clear();
      void channel?.unsubscribe();
      channel = null;
      ready = null;
      disconnect?.();
      disconnect = null;
    },
  };
};
