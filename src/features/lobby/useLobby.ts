import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { availableThemes } from '../../domain/themes/indiaEditionTheme';
import { getThemeOrDefault } from '../../domain/rules/engine/state.utils';
import { readDeviceId } from '../multiplayer/seatClaim.utils';
import {
  claimBlockedReason,
  inviteLinkFor,
  startBlockedReason,
} from '../multiplayer/lobby.utils';
import {
  attachOnlineSession,
  claimLobbySeat,
  openOnlineTable,
  startOnlineGame,
} from '../multiplayer/multiplayer.thunks';
import { useSession } from '../multiplayer/hooks/useSession';

/**
 * Everything the lobby page does, kept out of its markup.
 *
 * The page is one screen with three jobs - read the table, take a seat, start
 * the game - and each is an async call that can fail, so keeping them here
 * means the component stays a rendering of state rather than a pile of
 * handlers.
 */
export const useLobby = () => {
  const { gameId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const joinCode = (searchParams.get('code') ?? '').toUpperCase();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { seats, phase, lobbyError, seatId } = useAppSelector((state) => state.seat);
  // Re-renders when the session is replaced - see useSession - so the
  // subscription below attaches to the online session rather than staying on
  // the local one that never rings.
  const session = useSession();
  const [name, setName] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const theme = getThemeOrDefault(availableThemes[0]?.id ?? '');
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

  // Prefill from the seat this device already holds, so a reload is not a
  // blank form.
  useEffect(() => {
    if (mySeat) {
      setName((current) => current || mySeat.name);
      setTokenId((current) => current || mySeat.tokenId);
    }
  }, [mySeat]);

  const takenTokens = seats
    .filter((seat) => seat.deviceId !== readDeviceId())
    .map((seat) => seat.tokenId);

  // Nothing is offered until the table has actually been read. Acting on an
  // empty table is how a guest claimed a seat before its first fetch came back
  // and, with the old whole-array claim, deleted the host.
  const isLoaded = phase !== null;
  const claimReason = !isLoaded
    ? 'Loading the table…'
    : claimBlockedReason(seats, readDeviceId(), name, tokenId);
  const startReason = !isLoaded ? 'Loading the table…' : startBlockedReason(seats);

  const claim = useCallback(async () => {
    setIsBusy(true);
    try {
      await dispatch(claimLobbySeat({ gameId, joinCode, name, tokenId }));
    } finally {
      setIsBusy(false);
    }
  }, [dispatch, gameId, joinCode, name, tokenId]);

  const start = useCallback(async () => {
    setIsBusy(true);
    try {
      await dispatch(
        startOnlineGame({ gameId, joinCode, themeId: theme.id, useSpeedDie: false })
      );
      navigate(`/game/${gameId}`);
    } finally {
      setIsBusy(false);
    }
  }, [dispatch, gameId, joinCode, navigate, theme.id]);

  return {
    claim,
    claimReason,
    gameId,
    inviteLink: gameId && joinCode ? inviteLinkFor(gameId, joinCode) : '',
    isBusy,
    isLoaded,
    joinCode,
    lobbyError,
    mySeatId: mySeat?.seatId ?? seatId,
    name,
    phase,
    seats,
    setName,
    setTokenId,
    start,
    startReason,
    takenTokens,
    theme,
    tokenId,
  };
};
