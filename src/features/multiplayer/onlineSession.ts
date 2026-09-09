import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from './joinCode.constants';
import type { GameState, RuntimeGameCommand } from '../../domain/types/game.interfaces';
import { logger } from '../../shared/utils/logger.utils';
import { decodeGameState } from '../persistence/decodeGameState';
import type {
  GameSession,
  PublishOutcome,
  RemoteGameUpdate,
} from './gameSession.interfaces';
import type { OnlineSessionOptions } from './onlineSession.interfaces';
import { createDoorbell } from './doorbell';
import { rpc } from './supabaseRpc';
import type { PublishResponse } from './supabaseRpc.interfaces';

export type { OnlineSessionOptions } from './onlineSession.interfaces';

/**
 * A game whose authority is one row in Postgres.
 *
 * Two things make this small. The compare-and-set lives in the RPC, so there is
 * no locking here; and the realtime event is a doorbell rather than a payload,
 * so this never has to reconcile a partial message - it hears "the revision
 * moved" and fetches.
 *
 * The realtime library is imported dynamically: a player who never plays online
 * downloads none of it. `fetch` and `publish` need no library at all.
 */

/** How long to sit on a stale view before fetching anyway. */
const POLL_INTERVAL_MS = 30_000;

/** A game row that has seats but is not a game yet. */
const LOBBY_PHASE = 'lobby';

export const createJoinCode = (length = JOIN_CODE_LENGTH): string =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(length)),
    (byte) => JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length]
  ).join('');

/** Every state off the wire goes through the same decoder a disk load does. */
const decodeRemote = (raw: unknown, revision: number): RemoteGameUpdate | null => {
  try {
    return { game: decodeGameState(raw, 'another device').game, revision };
  } catch (error) {
    // A peer sent something this build cannot read. Refusing it is right:
    // adopting a half-understood state is worse than staying where we are.
    logger.error('multiplayer', 'refused a state from another device', {
      error: String(error),
    });
    return null;
  }
};

export const createOnlineSession = (options: OnlineSessionOptions): GameSession => {
  const { config, gameId, joinCode } = options;

  let closed = false;
  let poll: ReturnType<typeof setInterval> | null = null;

  const doorbell = createDoorbell(config, gameId, {
    deviceId: options.deviceId,
    seatId: options.seatId,
  });

  const fetchGame = async (): Promise<RemoteGameUpdate | null> => {
    const row = (await rpc.fetchGame(config, { gameId, joinCode })) as {
      revision: number;
      phase: string;
      state: unknown;
    } | null;

    // Null means no such game, or a wrong code - deliberately the same answer.
    if (!row) {
      return null;
    }

    // A lobby's state is not a game yet, so there is nothing to decode. The
    // poll used to try anyway and log "this game is damaged" every thirty
    // seconds for a table that was perfectly healthy - and, worse, threw before
    // it could report the revision, so a lobby could never be refreshed by the
    // poll at all.
    if (row.phase === LOBBY_PHASE) {
      return null;
    }
    return decodeRemote(row.state, row.revision);
  };

  return {
    isOnline: true,
    gameId: options.gameId,

    async publish({
      game,
      baseRevision,
      command,
    }: {
      game: GameState;
      baseRevision: number;
      command: RuntimeGameCommand | null;
    }): Promise<PublishOutcome> {
      if (closed) {
        return { status: 'failed', message: 'This session has been closed' };
      }

      try {
        const response = (await rpc.publishGameState(config, {
          gameId,
          joinCode,
          baseRevision,
          state: game,
          phase: game.status,
          seatId: options.seatId,
          command,
        })) as PublishResponse;

        if (response.accepted) {
          const revision = response.revision ?? baseRevision;
          // Fire-and-forget: this is a notification, not part of the write.
          void doorbell.ring(revision);
          return { status: 'accepted', revision };
        }

        // Distinct from a conflict on purpose: a conflict means adopt what came
        // back, `gone` means stop writing to this game altogether.
        if (response.notFound) {
          return { status: 'gone' };
        }

        const adopted = decodeRemote(response.state, response.revision ?? 0);
        if (!adopted) {
          return {
            status: 'failed',
            message: 'The table sent a state this build cannot read',
          };
        }
        return { status: 'conflict', revision: adopted.revision, game: adopted.game };
      } catch (error) {
        // Never throws into the command path: the move has already been applied
        // locally, and a connection problem must not look like a refusal.
        return { status: 'failed', message: String(error) };
      }
    },

    fetch: fetchGame,

    announce: (revision: number) => doorbell.ring(revision),

    onHere: (listener: (seatIds: string[]) => void) => doorbell.onHere(listener),

    subscribe(onRevision: (revision: number) => void): () => void {
      const stopListening = doorbell.onRing(onRevision);

      // A backstop, and not an optional one: a socket that is up but has
      // silently stopped delivering is the failure realtime transports
      // actually have, and a bell that never rings leaves the game looking
      // frozen with nothing on screen to explain why.
      poll ??= setInterval(() => {
        // Reads the row rather than the game: a lobby has no state to decode,
        // and the caller only ever needs the revision anyway.
        void rpc
          .fetchGame(config, { gameId, joinCode })
          .then((row) => {
            const revision = (row as { revision?: unknown } | null)?.revision;
            if (typeof revision === 'number') {
              onRevision(revision);
            }
          })
          .catch(() => undefined);
      }, POLL_INTERVAL_MS);

      return () => {
        stopListening();
        if (poll) {
          clearInterval(poll);
          poll = null;
        }
      };
    },

    close() {
      closed = true;
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
      doorbell.close();
    },
  };
};
