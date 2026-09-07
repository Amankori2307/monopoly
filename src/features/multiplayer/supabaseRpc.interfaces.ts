import type { GameState } from '../../domain/types/game.interfaces';

/** One seat at the table, as it is stored on the game row. */
export interface SeatRecord {
  seatId: string;
  name: string;
  tokenId: string;
  /** Which device holds this seat. A reconnect from a new device changes it. */
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
  /** Absent from a claim_seat response, which does not carry the state. */
  state?: GameState;
}

/** The shape of `publish_game_state`'s json result, before interpretation. */
export interface PublishResponse {
  accepted: boolean;
  notFound?: boolean;
  revision?: number;
  phase?: string;
  seats?: SeatRecord[];
  state?: unknown;
}
