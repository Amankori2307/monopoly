import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { GameId, PlayerId } from '../../domain/types/game.interfaces';
import { readDeviceId, readSeatClaim, writeSeatClaim } from './seatClaim.utils';
import type { LobbySeat } from './lobby.interfaces';
import { ConnectionState } from './viewer.enums';

/**
 * Which seat this device holds, and how the table is reaching it.
 *
 * Separate from the game slice because none of it belongs in the save: the seat
 * claim is per-device, and the connection state is per-session. Putting either
 * in `GameState` would mean each publish overwrote the other player's identity.
 */

interface SeatSliceState {
  /** The seat claimed on this device for the open game, if any. */
  seatId: PlayerId | null;
  deviceId: string;
  connection: ConnectionState;
  /** The join code for the open online game - the invite link's payload. */
  joinCode: string | null;
  /** The table as it stands, before the game exists. */
  seats: LobbySeat[];
  /** Null until a lobby has been fetched; 'lobby' or the game's own phase. */
  phase: string | null;
  /** Set when a lobby cannot be reached, or the code is wrong. */
  lobbyError: string | null;
  /**
   * Bumped every time the live session is replaced.
   *
   * The registry is not React state - a session holds a socket - so swapping it
   * re-renders nothing on its own. Without this, an effect that subscribed
   * during the first render stayed attached to the LOCAL session forever and
   * never heard a bell. Piggy-backing on `connection` looked like it worked and
   * did not: attaching sets it to Live, which is often the value it already
   * had, so no re-render happened at all.
   */
  sessionEpoch: number;
}

const initialState: SeatSliceState = {
  seatId: null,
  deviceId: '',
  connection: ConnectionState.Offline,
  joinCode: null,
  seats: [],
  phase: null,
  lobbyError: null,
  sessionEpoch: 0,
};

const slice = createSlice({
  name: 'seat',
  initialState,
  reducers: {
    /** Reads whatever this device already knows about a game it is opening. */
    restoreSeat(state, action: PayloadAction<GameId>) {
      state.seatId = readSeatClaim(action.payload);
      state.deviceId = state.deviceId || readDeviceId();
    },
    claimSeat(state, action: PayloadAction<{ gameId: GameId; seatId: PlayerId }>) {
      state.seatId = action.payload.seatId;
      writeSeatClaim(action.payload.gameId, action.payload.seatId);
    },
    setConnection(state, action: PayloadAction<ConnectionState>) {
      state.connection = action.payload;
    },
    setJoinCode(state, action: PayloadAction<string | null>) {
      state.joinCode = action.payload;
    },
    setLobby(state, action: PayloadAction<{ seats: LobbySeat[]; phase: string | null }>) {
      state.seats = action.payload.seats;
      state.phase = action.payload.phase;
      state.lobbyError = null;
    },
    setLobbyError(state, action: PayloadAction<string | null>) {
      state.lobbyError = action.payload;
    },
    /** Say the live session has been replaced, so subscribers re-attach. */
    sessionReplaced(state) {
      state.sessionEpoch += 1;
    },
    /** Leaving a game: forget the seat, keep the device id. */
    leaveTable(state) {
      state.seatId = null;
      state.joinCode = null;
      state.seats = [];
      state.phase = null;
      state.lobbyError = null;
      state.connection = ConnectionState.Offline;
    },
  },
});

export const seatReducer = slice.reducer;
export const {
  restoreSeat,
  claimSeat,
  setConnection,
  setJoinCode,
  setLobby,
  setLobbyError,
  sessionReplaced,
  leaveTable,
} = slice.actions;
export { initialState as seatInitialState };
