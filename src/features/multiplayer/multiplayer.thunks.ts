import { createGameState } from '../../domain/rules/gameEngine';
import { DefaultRandomSource } from '../../domain/rules/rng';
import { TableMode } from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';
import { logger } from '../../shared/utils/logger.utils';
import type { AppDispatch } from '../../app/appStore';
import { adoptRemoteGame, setActiveGame, setRevision } from '../game/gameSlice';
import { decodeGameState } from '../persistence/decodeGameState';
import { saveGame } from '../persistence/persistence';
import type { LobbySeat } from './lobby.interfaces';
import { MAX_PLAYERS } from '../../domain/constants/game.constants';
import { HOST_ONLY_START_REASON, HOST_SEAT_ID, nextFreeSeatId } from './lobby.utils';
import { TABLE_MESSAGES } from './multiplayer.constants';
import { onlineConfig } from './onlineConfig.utils';
import { createJoinCode, createOnlineSession } from './onlineSession';
import {
  readDeviceId,
  readHostSecret,
  writeHostSecret,
  writeJoinCode,
  writeSeatClaim,
} from './seatClaim.utils';
import {
  claimSeat,
  setConnection,
  setJoinCode,
  setLobby,
  setLobbyError,
  setStartRefusal,
  sessionReplaced,
} from './seatSlice';
import { rpc } from './supabaseRpc';
import type { ThunkExtra } from './sessionRegistry.interfaces';
import { ConnectionState } from './viewer.enums';
import { randomUUID } from '../../domain/rules/id.utils';

/**
 * Creating, joining and starting an online game.
 *
 * A lobby is a game row whose `phase` is still `lobby`: the seats are real, the
 * state is not a game yet. Building the GameState only when the host starts is
 * what lets players arrive one at a time - `createGameState` needs every player
 * up front and refuses fewer than two, so a lobby cannot be a half-built game.
 */

/** The protocol this build speaks. Bumped when the wire shape changes. */
// 2 is load-bearing for the first time, and is what 0001's comment always
// claimed the column was for: `publish_game_state` reads it to decide whether
// this row's lobby door is guarded. A build already open in somebody's tab
// created protocol-1 rows and starts them the only way it knows how, so those
// keep working.
const PROTOCOL_VERSION = 2;

/** `null` when this build has no backend configured - see onlineConfig. */
const requireConfig = () => {
  if (!onlineConfig) {
    throw new Error(TABLE_MESSAGES.offlineBuild);
  }
  return onlineConfig;
};

/**
 * Turns a typed join code into the table it names.
 *
 * `'missing'` covers a wrong code, a deleted game and a build with no server -
 * the same answer for all three, which is the rule the RPCs establish so game
 * ids stay unenumerable. The phase comes back too, so a latecomer whose table
 * has already started is sent into the game rather than to a lobby that is
 * gone.
 */
export const resolveJoinCode =
  (joinCode: string) =>
  async (): Promise<{ gameId: string; phase: string } | 'missing'> => {
    if (!onlineConfig) {
      return 'missing';
    }

    const found = await rpc.findGameByCode(onlineConfig, { joinCode });
    if (!found) {
      return 'missing';
    }
    return { gameId: found.id, phase: found.phase };
  };

/** Opens a table and takes the first seat. */
export const createOnlineLobby =
  (host: { name: string }) =>
  async (dispatch: AppDispatch): Promise<{ gameId: string; joinCode: string }> => {
    const config = requireConfig();
    const gameId = randomUUID();
    const joinCode = createJoinCode();
    const deviceId = readDeviceId();
    const seat: LobbySeat = {
      // Named rather than a literal `'player-1'`, because it is now also the
      // answer to "who may start this table" - `create_game` reads the host
      // seat out of the array it is handed, so the client never gets to say.
      seatId: HOST_SEAT_ID,
      name: host.name,
      deviceId,
      claimedAt: new Date().toISOString(),
    };

    const row = await rpc.createGame(config, {
      gameId,
      joinCode,
      // Not a game yet. The phase says so, and nothing decodes this until the
      // host starts and publishes a real state over it.
      state: {},
      seats: [seat],
      protocolVersion: PROTOCOL_VERSION,
    });

    // The one moment this value is ever disclosed. Without it this device can
    // read the table like anybody else and simply cannot start it.
    writeHostSecret(gameId, row?.hostSecret ?? null);

    dispatch(setJoinCode(joinCode));
    dispatch(
      setLobby({
        seats: [seat],
        phase: 'lobby',
        hostSeatId: row?.hostSeatId ?? seat.seatId,
      })
    );
    dispatch(claimSeat({ gameId, seatId: seat.seatId }));
    // The host invents the code and is never sent it, so without this the host
    // is the one device that cannot rejoin its own table after a reload.
    writeJoinCode(gameId, joinCode);
    return { gameId, joinCode };
  };

/**
 * Reads a table, whether it has started or not.
 *
 * One path for a lobby and for a game in progress, because a link shared before
 * the start is the same link afterwards - and somebody who follows it late must
 * land in the game rather than in a lobby that no longer exists.
 */
export const openOnlineTable =
  (gameId: string, joinCode: string) =>
  async (dispatch: AppDispatch): Promise<'lobby' | 'playing' | 'missing'> => {
    // A lobby link can be opened by a build with no server - somebody sharing
    // a link with a friend running an older or offline copy. Say so, rather
    // than throwing out of an effect and leaving a blank table on screen.
    if (!onlineConfig) {
      dispatch(setLobbyError(TABLE_MESSAGES.offlineBuild));
      return 'missing';
    }
    const config = onlineConfig;
    dispatch(setConnection(ConnectionState.Connecting));

    let row: {
      phase: string;
      revision: number;
      seats: LobbySeat[];
      hostSeatId: string | null;
      state: unknown;
    } | null;

    try {
      row = (await rpc.fetchGame(config, { gameId, joinCode })) as typeof row;
    } catch (error) {
      dispatch(setConnection(ConnectionState.Offline));
      dispatch(setLobbyError(TABLE_MESSAGES.unreachable));
      logger.error('multiplayer', 'could not open the table', { error: String(error) });
      return 'missing';
    }

    if (!row) {
      // The same answer for a wrong code and an unknown game, deliberately.
      dispatch(setConnection(ConnectionState.Offline));
      dispatch(setLobbyError(TABLE_MESSAGES.noSuchCode));
      return 'missing';
    }

    dispatch(setJoinCode(joinCode));
    // Only now: the code has just been proven to open a real table.
    writeJoinCode(gameId, joinCode);
    dispatch(
      setLobby({
        seats: row.seats ?? [],
        phase: row.phase,
        hostSeatId: row.hostSeatId ?? null,
      })
    );
    dispatch(setConnection(ConnectionState.Live));

    if (row.phase === 'lobby') {
      return 'lobby';
    }

    // Already playing. Same decoder as a disk load, so a state from another
    // device gets the migrations and the cross-field checks too.
    const { game } = decodeGameState(row.state, 'the table');
    dispatch(adoptRemoteGame({ game, revision: row.revision }));
    return 'playing';
  };

/** Takes or moves this device's seat at a lobby. */
export const claimLobbySeat =
  (input: { gameId: string; joinCode: string; name: string }) =>
  async (
    dispatch: AppDispatch,
    getState: () => { seat: { seats: LobbySeat[] } },
    extra: ThunkExtra
  ) => {
    const config = requireConfig();
    const deviceId = readDeviceId();
    const existing = getState().seat.seats;
    // A device already at the table is moving, not arriving.
    const mine = existing.find((seat) => seat.deviceId === deviceId);
    const seatId =
      mine?.seatId ??
      nextFreeSeatId(existing.filter((seat) => seat.deviceId !== deviceId));

    if (!seatId) {
      dispatch(setLobbyError(TABLE_MESSAGES.tableFull));
      return;
    }

    // One seat, not the list: the merge is the server's job, or a client that
    // has not finished loading overwrites everybody with itself.
    const row = (await rpc.claimSeat(config, {
      gameId: input.gameId,
      joinCode: input.joinCode,
      maxPlayers: MAX_PLAYERS,
      // Sent only by the device that opened the table, and only ever matched
      // against this row: it is what lets a host returning on a new laptop
      // take its own chair back from the stale device sitting in it.
      hostSecret: readHostSecret(input.gameId),
      seat: {
        seatId,
        name: input.name,
        deviceId,
        claimedAt: new Date().toISOString(),
      },
    })) as {
      seats: LobbySeat[];
      phase: string;
      hostSeatId?: string | null;
      full?: boolean;
      hostSeatTaken?: boolean;
    } | null;

    if (!row) {
      dispatch(setLobbyError(TABLE_MESSAGES.tableGone));
      return;
    }
    // Both refusals go to `startRefusal`, NOT to `lobbyError`: LobbyPage treats
    // a lobbyError as fatal and replaces the whole screen with "That table is
    // not there", which is a lie about a table it has just read the seats of.
    if (row.full) {
      dispatch(setLobby({ seats: row.seats, phase: 'lobby' }));
      dispatch(setStartRefusal(TABLE_MESSAGES.tableFull));
      return;
    }
    if (row.hostSeatTaken) {
      dispatch(setLobby({ seats: row.seats, phase: 'lobby' }));
      dispatch(setStartRefusal('That seat belongs to the host'));
      return;
    }

    dispatch(
      setLobby({
        seats: row.seats,
        phase: row.phase,
        hostSeatId: row.hostSeatId ?? undefined,
      })
    );
    dispatch(claimSeat({ gameId: input.gameId, seatId }));

    // claim_seat bumps the revision but writes nothing through publish(), so
    // nothing has rung. Without this the others watch a stale table until their
    // poll comes round - up to thirty seconds of wondering where you went.
    await extra.session.current.announce((row as { revision?: number }).revision ?? 0);
  };

/**
 * Builds the game from the seats and starts the table.
 *
 * The seat ids become the player ids, which is why they are fixed at claim
 * time: a claim written in the lobby has to still name the right player the
 * instant the game exists.
 *
 * Through `start_game` rather than `publish_game_state`, and that is the whole
 * of the host rule. A publish authorises on the join code and a revision, which
 * is a bearer capability every guest holds - so hiding the button did nothing,
 * and the door had to move to the server. `start_game` also takes the phase as
 * its compare-and-set, which is why the `fetchGame` that used to precede this
 * purely to learn a revision is gone, and the window between reading it and
 * writing with it.
 */
export const startOnlineGame =
  (input: { gameId: string; joinCode: string; themeId: string; useSpeedDie: boolean }) =>
  async (
    dispatch: AppDispatch,
    getState: () => { seat: { seats: LobbySeat[] } },
    extra: ThunkExtra
  ): Promise<GameState | null> => {
    const config = requireConfig();
    const seats = getState().seat.seats;

    const game = createGameState(
      {
        gameId: input.gameId,
        name: 'Online game',
        playerConfigs: seats.map((seat) => ({
          name: seat.name,
          playerId: seat.seatId,
        })),
        themeId: input.themeId,
        createdAt: new Date().toISOString(),
        useSpeedDie: input.useSpeedDie,
        tableMode: TableMode.Online,
      },
      new DefaultRandomSource()
    );

    const response = await rpc.startGame(config, {
      gameId: input.gameId,
      joinCode: input.joinCode,
      state: game,
      phase: 'in_progress',
      // The ids, never the array - 0003's rule. The server compares them with
      // the row's own seats, so a player who sat down while this was being
      // built cannot be left out of the game they are waiting in.
      seatIds: seats.map((seat) => seat.seatId),
      deviceId: readDeviceId(),
      hostSecret: readHostSecret(input.gameId),
    });

    if (response.notFound) {
      dispatch(setLobbyError(TABLE_MESSAGES.tableGone));
      return null;
    }

    if (response.notHost) {
      // The same sentence the disabled button carries, from the same constant.
      // A guest should never reach this - but a stale `hostSeatId` or a second
      // tab can, and a refusal nobody can read is the Buy bug again.
      dispatch(setStartRefusal(HOST_ONLY_START_REASON));
      return null;
    }

    if (response.seatsChanged) {
      // Not replayed, REBUILT. A start is a construction from the seats as they
      // are, not a command applied to a base - so unlike a move it is safe to
      // make again, and the caller does exactly that with the fresh seats.
      dispatch(
        setLobby({ seats: (response.seats ?? []) as LobbySeat[], phase: 'lobby' })
      );
      return null;
    }

    if (!response.started && response.state) {
      // Somebody started first. Their game wins, the same way a publish
      // conflict resolves.
      const { game: theirs } = decodeGameState(response.state, 'the table');
      dispatch(adoptRemoteGame({ game: theirs, revision: response.revision ?? 0 }));
      return theirs;
    }

    saveGame(game);
    dispatch(setActiveGame(game));
    dispatch(setRevision(response.revision ?? 1));
    // Everyone still sitting in the lobby is carried into the game by this.
    await extra.session.current.announce(response.revision ?? 1);
    return game;
  };

/** Points the session at this game, so publishes and the doorbell work. */
export const attachOnlineSession =
  (input: { gameId: string; joinCode: string; seatId: string | null }) =>
  (dispatch: AppDispatch, _getState: unknown, extra: ThunkExtra) => {
    const config = requireConfig();
    extra.session.replace(
      createOnlineSession({
        config,
        gameId: input.gameId,
        joinCode: input.joinCode,
        seatId: input.seatId,
        deviceId: readDeviceId(),
      })
    );
    if (input.seatId) {
      writeSeatClaim(input.gameId, input.seatId);
    }
    // Not `setConnection` alone: attaching often sets it to the value it
    // already had, so nothing re-rendered and every subscriber stayed on the
    // local session. This is the signal that the session itself changed.
    dispatch(sessionReplaced());
    dispatch(setConnection(ConnectionState.Live));
  };
