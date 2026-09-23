import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { getThemeOrDefault } from '../../domain/rules/engine/state.utils';
import { playerColorForIndex } from '../../domain/themes/playerColors.constants';
import type { LobbySeatView } from '../../components/lobby/lobby.interfaces';
import { readDeviceId, readHostSecret } from '../multiplayer/seatClaim.utils';
import {
  inviteLinkFor,
  isHostDevice,
  seatIndexOf,
  startBlockedReason,
} from '../multiplayer/lobby.utils';
import {
  attachOnlineSession,
  openOnlineTable,
  startOnlineGame,
} from '../multiplayer/multiplayer.thunks';
import { useSession } from '../multiplayer/hooks/useSession';

/**
 * Everything the lobby page does, kept out of its markup.
 *
 * It had three jobs - read the table, take a seat, start the game - and takes
 * a seat no longer. Joining a table IS taking a seat, so `/join` asks for the
 * code and the name together and seats you on the way in; this screen is a
 * roster with a Start button on it, and only for the one person who may press
 * it. What went with the claim: `name`, `tokenId`, `setName`, `setTokenId`,
 * `takenTokens`, `claim` and `claimReason`.
 */
export const useLobby = () => {
  const { gameId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const joinCode = (searchParams.get('code') ?? '').toUpperCase();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { seats, phase, lobbyError, seatId, hostSeatId, startRefusal } = useAppSelector(
    (state) => state.seat
  );
  // Re-renders when the session is replaced - see useSession - so the
  // subscription below attaches to the online session rather than staying on
  // the local one that never rings.
  const session = useSession();
  const [isBusy, setIsBusy] = useState(false);

  // The table's options travel in the URL beside the code, because this is
  // where the game is STARTED and the host chose them a screen ago. They used
  // to be hardcoded here - `availableThemes[0]` and `useSpeedDie: false` - so
  // every online table was the first edition and no online game could ever use
  // the Speed Die. getThemeOrDefault falls back, so an absent or tampered
  // param degrades to the default rather than throwing. Only the host's own URL
  // carries them now: nobody else can start a game with them.
  const theme = getThemeOrDefault(searchParams.get('theme') ?? '');
  const useSpeedDie = searchParams.get('speed') === 'on';
  const mySeat = seats.find((seat) => seat.deviceId === readDeviceId());

  useEffect(() => {
    if (!gameId || !joinCode) {
      return;
    }
    void dispatch(openOnlineTable(gameId, joinCode)).then((outcome) => {
      if (outcome === 'missing') {
        return;
      }
      dispatch(attachOnlineSession({ gameId, joinCode, seatId: mySeat?.seatId ?? null }));
      if (outcome === 'playing') {
        // Somebody started while this device was on its way in.
        navigate(`/game/${gameId}`);
      }
    });
    // Deliberately once per table: re-running on every seat change would refetch
    // the row the bell has already delivered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, gameId, joinCode]);

  // The same bell the game uses, but a lobby cannot go through `useTableSync`:
  // that fetches and *decodes* a GameState, and a lobby's state is not a game
  // yet. Re-reading the row is the right response here - it refreshes the seats,
  // and carries this device into the game the moment the host starts.
  useEffect(() => {
    if (!gameId || !joinCode) {
      return;
    }
    let cancelled = false;
    const unsubscribe = session.subscribe(() => {
      void dispatch(openOnlineTable(gameId, joinCode)).then((outcome) => {
        if (!cancelled && outcome === 'playing') {
          navigate(`/game/${gameId}`);
        }
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // Deliberately NOT keyed on `connection`. The handler below calls
    // openOnlineTable, which sets connection to Connecting - so an effect that
    // depended on it tore itself down mid-flight, marked its own pending
    // promise cancelled, and swallowed the navigate. The guest sat in the lobby
    // while the host was already playing. `session` changes identity only when
    // the session is genuinely replaced, which is the thing worth re-subscribing
    // for.
  }, [dispatch, gameId, joinCode, navigate, session]);

  // Nothing is offered until the table has actually been read. Acting on an
  // empty table is how a guest claimed a seat before its first fetch came back
  // and, with the old whole-array claim, deleted the host.
  const isLoaded = phase !== null;
  const isHost = isHostDevice(
    seats,
    hostSeatId,
    readDeviceId(),
    readHostSecret(gameId) !== null
  );

  /**
   * A seat's colour is its INDEX, and nothing is stored or sent for it.
   *
   * `player-3` is palette entry 2 in the lobby and still palette entry 2 once
   * `createGameState` assigns colours in creation order - so what a player sees
   * here is what they get on the board.
   */
  const seatViews: LobbySeatView[] = seats.map((seat) => ({
    seatId: seat.seatId,
    name: seat.name,
    color: playerColorForIndex(seatIndexOf(seat.seatId)).color,
  }));

  const startReason = !isLoaded
    ? 'Loading the table…'
    : (startBlockedReason(seats, isHost) ?? startRefusal);

  const start = useCallback(async () => {
    setIsBusy(true);
    try {
      const started = await dispatch(
        startOnlineGame({ gameId, joinCode, themeId: theme.id, useSpeedDie })
      );
      // Only on a start that actually happened. A refusal leaves its reason on
      // screen, and navigating past it would land this device in a game the
      // server does not have.
      if (started) {
        navigate(`/game/${gameId}`);
      }
    } finally {
      setIsBusy(false);
    }
  }, [dispatch, gameId, joinCode, navigate, theme.id, useSpeedDie]);

  return {
    gameId,
    hostSeatId,
    inviteLink: joinCode ? inviteLinkFor(joinCode) : '',
    isBusy,
    isHost,
    isLoaded,
    joinCode,
    lobbyError,
    mySeatId: mySeat?.seatId ?? seatId,
    phase,
    seats: seatViews,
    start,
    startReason,
    theme,
  };
};
