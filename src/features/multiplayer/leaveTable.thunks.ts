import { logger } from '../../shared/utils/logger.utils';
import type { AppDispatch } from '../../app/appStore';
import type { LobbySeat } from './lobby.interfaces';
import { onlineConfig } from './onlineConfig.utils';
import {
  clearHostSecret,
  clearJoinCode,
  clearSeatClaim,
  readDeviceId,
} from './seatClaim.utils';
import { leaveTable, setLobby } from './seatSlice';
import { rpc } from './supabaseRpc';
import type { ThunkExtra } from './sessionRegistry.interfaces';

/**
 * Getting up from a table.
 *
 * Its own module rather than a sixth thunk in `multiplayer.thunks`: everything
 * there builds a table up - creates it, reads it, sits down at it, starts it -
 * and this is the only one that tears one down, which is why its failure
 * handling is the opposite shape. A refusal there leaves you outside a game you
 * wanted to be in; a refusal here would leave you inside one you wanted to
 * leave, so the local forget is the thing that must not happen by accident.
 */

/**
 * Leaves a table and forgets everything this device knew about it.
 *
 * There was no way out at all: `claim_seat` adds and evicts, nothing removed,
 * so somebody who followed an invite link by accident sat there for the row's
 * whole 30-day life. `leaveTable` has been in the slice since it was written
 * and was dispatched from nowhere, because it had no server call to follow.
 *
 * The ordering below is the whole of it, and every step is load-bearing:
 *
 *   1. Tell the server first. A local forget with no call leaves a ghost in a
 *      chair that still counts against MAX_PLAYERS.
 *   2. Ring the bell BEFORE the session is reset, while there is still an
 *      online session to ring it with. `leave_seat` bumps the revision but
 *      writes nothing through `publish`, so - exactly as with a seat claim -
 *      nothing has rung, and the others would watch an occupied chair until
 *      their 30s poll came round.
 *   3. Only then forget: the claim, the code and the secret. The secret is
 *      already null on the row if this device was the host, so keeping a copy
 *      would be a credential for a table that no longer honours it.
 *
 * A transport failure does NOT forget locally. That is the same call
 * `connection.utils` makes for a move: a device that has quietly left a table
 * the server still seats it at is a fork, and a visible refusal is worse to
 * look at and far easier to recover from.
 */
export const leaveOnlineTable =
  (input: { gameId: string; joinCode: string }) =>
  async (
    dispatch: AppDispatch,
    _getState: unknown,
    extra: ThunkExtra
  ): Promise<'left' | 'started' | 'missing' | 'unreachable'> => {
    const forget = () => {
      clearSeatClaim(input.gameId);
      clearJoinCode(input.gameId);
      clearHostSecret(input.gameId);
      dispatch(leaveTable());
      extra.session.reset();
    };

    // A build with no server can still be sitting on a lobby URL. There is
    // nothing to tell and nothing to fail, so the forget is the whole job.
    if (!onlineConfig) {
      forget();
      return 'left';
    }

    let response;
    try {
      response = await rpc.leaveSeat(onlineConfig, {
        gameId: input.gameId,
        joinCode: input.joinCode,
        deviceId: readDeviceId(),
      });
    } catch (error) {
      logger.error('multiplayer', 'could not leave the table', { error: String(error) });
      return 'unreachable';
    }

    if (response.notFound) {
      // The table is gone, so there is nothing to be seated at. Forgetting is
      // right here where it is wrong above: the seat cannot outlive the row.
      forget();
      return 'missing';
    }

    if (response.alreadyStarted) {
      // The host started between the click and the answer. This device's seat
      // is a player on a board now, and `playerOrder` is fixed at
      // `createGameState` - so forgetting it would leave a player nobody can
      // act for and a turn that can never end, which breaks the game for
      // everyone still at the table rather than only for the person leaving.
      // The caller goes into the game, exactly as the lobby's own bell would.
      dispatch(
        setLobby({
          seats: (response.seats ?? []) as LobbySeat[],
          phase: response.phase ?? null,
        })
      );
      return 'started';
    }

    await extra.session.current.announce(response.revision ?? 0);
    forget();
    return 'left';
  };
