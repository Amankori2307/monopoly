import type { OnlineConfig } from './onlineConfig.interfaces';
import type {
  CreatedGameRow,
  LeaveSeatResponse,
  StartGameResponse,
} from './supabaseRpc.interfaces';

/**
 * The six RPCs, over plain `fetch`.
 *
 * No SDK here on purpose: a PostgREST function call is a POST with two headers
 * and a JSON body, and the full supabase-js client is ~28% of this app's whole
 * bundle to wrap that. The realtime socket genuinely needs a library and gets
 * one, dynamically imported - see onlineSession.
 *
 * Every call takes the join code, because that is the capability. Holding it is
 * what lets you read and write a game; the database cannot tell a legal state
 * from a fabricated one, so this is a game for people who already trust each
 * other. Written down here and in docs/features/multiplayer.md rather than left
 * to be discovered.
 */

/** Thrown for a transport or server failure - never for "no such game". */
export class RpcError extends Error {
  constructor(
    readonly rpc: string,
    message: string
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

const callRpc = async <T>(
  config: OnlineConfig,
  name: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // Offline, DNS, CORS, an aborted request. All the same to a caller: this
    // did not reach the table.
    throw new RpcError(name, `Could not reach the game server (${String(error)})`);
  }

  if (!response.ok) {
    // Not-found is a value rather than a status - see migration 0002 - so
    // anything non-2xx here is a real fault worth reporting.
    const detail = await response.text().catch(() => '');
    throw new RpcError(name, `${name} failed (${response.status}) ${detail}`.trim());
  }

  return (await response.json()) as T;
};

export const rpc = {
  createGame: (
    config: OnlineConfig,
    input: {
      gameId: string;
      joinCode: string;
      state: unknown;
      seats: unknown[];
      protocolVersion: number;
    }
  ) =>
    callRpc<CreatedGameRow>(config, 'create_game', {
      p_game_id: input.gameId,
      p_join_code: input.joinCode,
      p_state: input.state,
      p_seats: input.seats,
      p_protocol_version: input.protocolVersion,
    }),

  /** Null when there is no such game, or the code is wrong - the same answer
   *  for both, so game ids cannot be enumerated. */
  fetchGame: (
    config: OnlineConfig,
    input: { gameId: string; joinCode: string },
    signal?: AbortSignal
  ) =>
    callRpc<unknown>(
      config,
      'fetch_game',
      { p_game_id: input.gameId, p_join_code: input.joinCode },
      signal
    ),

  /**
   * Resolves a typed join code to the table it belongs to, or null.
   *
   * Deliberately returns the id and the phase and nothing else: the caller
   * still has to `fetchGame` with the pair, so this is a resolver rather than
   * a second way to read a game. See migration 0004 for what it costs.
   */
  findGameByCode: (
    config: OnlineConfig,
    input: { joinCode: string },
    signal?: AbortSignal
  ) =>
    callRpc<{ id: string; phase: string } | null>(
      config,
      'find_game_by_code',
      { p_join_code: input.joinCode },
      signal
    ),

  publishGameState: (
    config: OnlineConfig,
    input: {
      gameId: string;
      joinCode: string;
      baseRevision: number;
      state: unknown;
      phase?: string | null;
      seats?: unknown[] | null;
      seatId?: string | null;
      command?: unknown;
    }
  ) =>
    callRpc<unknown>(config, 'publish_game_state', {
      p_game_id: input.gameId,
      p_join_code: input.joinCode,
      p_base_revision: input.baseRevision,
      p_state: input.state,
      p_phase: input.phase ?? null,
      p_seats: input.seats ?? null,
      p_seat_id: input.seatId ?? null,
      p_command: input.command ?? null,
    }),

  /**
   * Sends ONE seat, never the whole table.
   *
   * It used to send the array, which made every claim a last-writer-wins
   * overwrite of everybody - a client that had not finished loading sent an
   * array containing only itself and the other players vanished. The merge is
   * done in SQL under the row lock now; see migration 0003.
   */
  claimSeat: (
    config: OnlineConfig,
    input: {
      gameId: string;
      joinCode: string;
      seat: unknown;
      maxPlayers: number;
      /** Present only on the host's own device: lets them retake their seat. */
      hostSecret?: string | null;
    }
  ) =>
    callRpc<unknown>(config, 'claim_seat', {
      p_game_id: input.gameId,
      p_join_code: input.joinCode,
      p_seat: input.seat,
      p_max_players: input.maxPlayers,
      p_host_secret: input.hostSecret ?? null,
    }),

  /**
   * Takes the table out of the lobby, and the only write with an authorisation
   * rule on it.
   *
   * Its own function rather than a branch in `publishGameState`, for three
   * reasons. Publish is the hot path for every move, and teaching it who the
   * host is is how the host becomes an authority over a running game by
   * accident. The PHASE is the compare-and-set here - `lobby` is a one-way
   * door, so exactly one start can win - where a revision CAS would refuse a
   * start because an unrelated seat claim had bumped the row. And it can check
   * something a move cannot: that the seats this game was built from are still
   * the seats on the row, sent as IDS rather than as the array, per 0003.
   */
  startGame: (
    config: OnlineConfig,
    input: {
      gameId: string;
      joinCode: string;
      state: unknown;
      phase: string;
      seatIds: string[];
      deviceId: string;
      hostSecret?: string | null;
    }
  ) =>
    callRpc<StartGameResponse>(config, 'start_game', {
      p_game_id: input.gameId,
      p_join_code: input.joinCode,
      p_state: input.state,
      p_phase: input.phase,
      p_seat_ids: input.seatIds,
      p_device_id: input.deviceId,
      p_host_secret: input.hostSecret ?? null,
    }),

  /**
   * Gets up from a table, by DEVICE rather than by seat.
   *
   * Naming a seat would let any code-holder remove any player; a device can
   * only ever remove itself, which is 0003's rule applied to a departure. If
   * the departing device held the host's chair the server transfers it to
   * whoever arrived next and clears the secret in the same statement - see
   * migration 0006 for why leaving the secret set is worse than having no host
   * at all.
   */
  leaveSeat: (
    config: OnlineConfig,
    input: { gameId: string; joinCode: string; deviceId: string }
  ) =>
    callRpc<LeaveSeatResponse>(config, 'leave_seat', {
      p_game_id: input.gameId,
      p_join_code: input.joinCode,
      p_device_id: input.deviceId,
    }),
};
