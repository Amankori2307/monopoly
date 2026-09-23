import type { GameState } from '../../domain/types/game.interfaces';

/** One seat at the table, as it is stored on the game row. */
export interface SeatRecord {
  seatId: string;
  name: string;
  /**
   * Which device holds this seat. A reconnect from a new device changes it.
   *
   * Returned to every code-holder, which is why it cannot be the proof that
   * somebody opened the table. See `hostSecret`.
   */
  deviceId: string;
  claimedAt: string;
}

/** What `fetch_game` and `claim_seat` hand back. */
export interface RemoteGameRow {
  id: string;
  joinCode: string;
  phase: string;
  revision: number;
  seats: SeatRecord[];
  /**
   * Which seat opened the table. Public, and already derivable from the
   * earliest `claimedAt` in an array every code-holder reads - it names the
   * host in the lobby and tells a guest why its Start is dead.
   */
  hostSeatId: string | null;
  /** Absent from a claim_seat response, which does not carry the state. */
  state?: GameState;
}

/**
 * What `create_game` hands back, and the ONE disclosure of the host secret.
 *
 * If this field ever appears on a second response shape, it has stopped being
 * a capability: every device at the table can read the others.
 */
export interface CreatedGameRow extends RemoteGameRow {
  hostSecret: string | null;
}

/** The shape of `publish_game_state`'s json result, before interpretation. */
export interface PublishResponse {
  accepted: boolean;
  notFound?: boolean;
  /** The row is still a lobby, and only `start_game` may take it out of one. */
  lobbyLocked?: boolean;
  revision?: number;
  phase?: string;
  seats?: SeatRecord[];
  state?: unknown;
}

/**
 * What `start_game` hands back.
 *
 * Its own shape rather than a `PublishResponse`: a start's refusals are not a
 * move's. `notHost` is not a conflict, and mapping it onto one would put an
 * authorisation failure through the code path every command in the game reads.
 */
export interface StartGameResponse {
  started: boolean;
  notFound?: boolean;
  /** This device did not open the table. */
  notHost?: boolean;
  /** Somebody started first; `state` carries the game that actually exists. */
  alreadyStarted?: boolean;
  /** Somebody sat down while the game was being built, so rebuild it. */
  seatsChanged?: boolean;
  revision?: number;
  phase?: string;
  seats?: SeatRecord[];
  state?: unknown;
}
