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
import { nextFreeSeatId } from './lobby.utils';
import { onlineConfig } from './onlineConfig.utils';
import { createJoinCode, createOnlineSession } from './onlineSession';
import { readDeviceId, writeSeatClaim } from './seatClaim.utils';
import {
  claimSeat,
  setConnection,
  setJoinCode,
  setLobby,
  setLobbyError,
} from './seatSlice';
import { rpc } from './supabaseRpc';
import type { ThunkExtra } from './sessionRegistry.interfaces';
import { ConnectionState } from './viewer.enums';

/**
 * Creating, joining and starting an online game.
 *
 * A lobby is a game row whose `phase` is still `lobby`: the seats are real, the
 * state is not a game yet. Building the GameState only when the host starts is
 * what lets players arrive one at a time - `createGameState` needs every player
 * up front and refuses fewer than two, so a lobby cannot be a half-built game.
 */

/** The protocol this build speaks. Bumped when the wire shape changes. */
const PROTOCOL_VERSION = 1;

/** `null` when this build has no backend configured - see onlineConfig. */
const requireConfig = () => {
  if (!onlineConfig) {
    throw new Error('This build has no game server configured.');
  }
  return onlineConfig;
};

/** Opens a table and takes the first seat. */
export const createOnlineLobby =
  (host: { name: string; tokenId: string }) =>
  async (dispatch: AppDispatch): Promise<{ gameId: string; joinCode: string }> => {
    const config = requireConfig();
    const gameId = crypto.randomUUID();
    const joinCode = createJoinCode();
    const deviceId = readDeviceId();
    const seat: LobbySeat = {
      seatId: 'player-1',
      name: host.name,
      tokenId: host.tokenId,
      deviceId,
      claimedAt: new Date().toISOString(),
    };

    await rpc.createGame(config, {
      gameId,
      joinCode,
      // Not a game yet. The phase says so, and nothing decodes this until the
      // host starts and publishes a real state over it.
      state: {},
      seats: [seat],
      protocolVersion: PROTOCOL_VERSION,
    });

    dispatch(setJoinCode(joinCode));
    dispatch(setLobby({ seats: [seat], phase: 'lobby' }));
    dispatch(claimSeat({ gameId, seatId: seat.seatId }));
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
      dispatch(setLobbyError('This copy of the game cannot play online.'));
      return 'missing';
    }
    const config = onlineConfig;
    dispatch(setConnection(ConnectionState.Connecting));

    let row: {
      phase: string;
      revision: number;
      seats: LobbySeat[];
      state: unknown;
    } | null;

    try {
      row = (await rpc.fetchGame(config, { gameId, joinCode })) as typeof row;
    } catch (error) {
      dispatch(setConnection(ConnectionState.Offline));
      dispatch(setLobbyError('Could not reach the game server.'));
      logger.error('multiplayer', 'could not open the table', { error: String(error) });
      return 'missing';
    }

    if (!row) {
      // The same answer for a wrong code and an unknown game, deliberately.
      dispatch(setConnection(ConnectionState.Offline));
      dispatch(setLobbyError('No game with that code.'));
      return 'missing';
    }

    dispatch(setJoinCode(joinCode));
    dispatch(setLobby({ seats: row.seats ?? [], phase: row.phase }));
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
  (input: { gameId: string; joinCode: string; name: string; tokenId: string }) =>
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
      dispatch(setLobbyError('This table is full.'));
      return;
    }

    // One seat, not the list: the merge is the server's job, or a client that
    // has not finished loading overwrites everybody with itself.
    const row = (await rpc.claimSeat(config, {
      gameId: input.gameId,
      joinCode: input.joinCode,
      maxPlayers: MAX_PLAYERS,
      seat: {
        seatId,
        name: input.name,
        tokenId: input.tokenId,
        deviceId,
        claimedAt: new Date().toISOString(),
      },
    })) as { seats: LobbySeat[]; phase: string; full?: boolean } | null;

    if (!row) {
      dispatch(setLobbyError('That game is no longer there.'));
      return;
    }
    if (row.full) {
      dispatch(setLobby({ seats: row.seats, phase: 'lobby' }));
      dispatch(setLobbyError('This table is full.'));
      return;
    }

    dispatch(setLobby({ seats: row.seats, phase: row.phase }));
    dispatch(claimSeat({ gameId: input.gameId, seatId }));

    // claim_seat bumps the revision but writes nothing through publish(), so
    // nothing has rung. Without this the others watch a stale table until their
    // poll comes round - up to thirty seconds of wondering where you went.
    await extra.session.current.announce((row as { revision?: number }).revision ?? 0);
  };

/**
 * Builds the game from the seats and publishes it.
 *
 * The seat ids become the player ids, which is why they are fixed at claim
 * time: a claim written in the lobby has to still name the right player the
 * instant the game exists.
 */
export const startOnlineGame =
  (input: { gameId: string; joinCode: string; themeId: string; useSpeedDie: boolean }) =>
  async (
    dispatch: AppDispatch,
    getState: () => { seat: { seats: LobbySeat[] } },
    extra: ThunkExtra
  ): Promise<GameState> => {
    const config = requireConfig();
    const seats = getState().seat.seats;

    const game = createGameState(
      {
        gameId: input.gameId,
        name: 'Online game',
        playerConfigs: seats.map((seat) => ({
          name: seat.name,
          tokenId: seat.tokenId,
          playerId: seat.seatId,
        })),
        themeId: input.themeId,
        createdAt: new Date().toISOString(),
        useSpeedDie: input.useSpeedDie,
        tableMode: TableMode.Online,
      },
      new DefaultRandomSource()
    );

    const response = (await rpc.publishGameState(config, {
      gameId: input.gameId,
      joinCode: input.joinCode,
      // The lobby row is at whatever revision the last claim left it, so read
      // it back rather than assuming. A conflict here means somebody else
      // started the game first, which is not an error - their game wins.
      baseRevision: (
        (await rpc.fetchGame(config, {
          gameId: input.gameId,
          joinCode: input.joinCode,
        })) as { revision: number }
      ).revision,
      state: game,
      phase: 'in_progress',
      seats,
      command: null,
    })) as { accepted: boolean; revision?: number; state?: unknown };

    if (!response.accepted && response.state) {
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
    dispatch(setConnection(ConnectionState.Live));
  };
