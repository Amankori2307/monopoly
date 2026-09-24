-- Getting up from a table, and what happens to the host's chair when they do.
--
-- There was no way out. `claim_seat` adds and evicts; nothing ever removed a
-- seat, so somebody who followed an invite link by accident sat at that table
-- for the row's whole 30-day life, counting against MAX_PLAYERS and against
-- MIN_PLAYERS' opposite - a host looking at a stranger in seat four with no way
-- to get rid of them. The client had half of this already: `leaveTable` has
-- been in seatSlice since the slice was written and was dispatched nowhere,
-- because there was no server call for it to follow.
--
-- THE HOST IS THE WHOLE DIFFICULTY, and it is smaller than it looks. Per 0005
-- the host controls exactly one transition - lobby -> playing - and has no
-- authority whatsoever over a running game, deliberately, so that closing a
-- laptop mid-game ends nothing. The consequence is that a host who leaves
-- matters in the lobby and nowhere else: their seat is the only one whose
-- departure can brick a table, by leaving a row that every remaining player can
-- read, can sit at, and can never start.
--
-- So this transfers the chair. The earliest remaining `claimedAt` becomes the
-- host, which is the same "who got here first" rule 0005's backfill used, tie-
-- broken on seatId so a row written inside one millisecond still resolves the
-- same way twice.
--
-- THE TRAP, worth stating because it is silent and total: `start_game` checks
-- the secret FIRST and the device second. Moving `host_seat_id` while leaving
-- `host_secret` set arms the strongest branch with a value that nobody holds -
-- the departing host took it with them - and the device branch is never
-- reached, so the transfer produces a table that is MORE unstartable than the
-- one it was fixing. A transfer therefore nulls the secret in the same
-- statement, which drops the row onto 0005's device branch: "are you the device
-- sitting in the host's seat", which the new host is, and which the departing
-- one is not.
--
-- What that costs, stated rather than discovered. The device branch is weaker
-- than the secret: `fetch_game` hands every deviceId to every code-holder, so a
-- code-holder who wants to start a transferred table can spoof it. That is
-- 0005's own transitional branch, and it is the same weakening for the same
-- reason - the alternative is a table nobody can start. It is also bounded:
-- only a table whose host actually walked out is on it, and starting a game is
-- the one thing a code-holder could already do to a lobby by taking a free seat
-- and waiting. Minting a fresh secret is not available here - the caller
-- leaving is not the device that would need to hold it, and there is nowhere to
-- deliver it to.
--
-- Not a deletion when the last player leaves. An empty row is harmless - it
-- holds no state anybody wants and `expires_at` reaps it - and deleting would
-- cascade `game_states` and `game_moves` out from under any client still
-- fetching, turning a departure into "that table is no longer there" for a
-- device that is merely slow.

-- ---------------------------------------------------------------------------
-- leave_seat
-- ---------------------------------------------------------------------------
--
-- By DEVICE, not by seat id, and that is the same reasoning 0003 used for the
-- merge: a client says who it is, never which chairs exist. Asking it for a
-- seat id would let any code-holder remove any player by naming their seat.
-- A device can only ever remove itself.
--
-- Refuses once the game has started. A seat is a player by then, `playerOrder`
-- is fixed at `createGameState`, and the engine has no command for removing
-- one - so a seat vacated mid-game would leave a player nobody can act for and
-- a turn that can never end. Leaving a game in progress is a client-side
-- forget (the device drops its claim and stops publishing); the table carries
-- on with the player still on the board, which is what closing a laptop already
-- does.

create or replace function public.leave_seat(
  p_game_id uuid,
  p_join_code text,
  p_device_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_seats jsonb;
  v_was_host boolean;
  v_next_host text;
begin
  if p_device_id is null then
    raise exception 'A departure needs a deviceId'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_game from public.games
   where id = p_game_id and join_code = upper(p_join_code)
   for update;

  if not found then
    -- 0002's rule: not-found is a value. A mistyped code and a reaped table
    -- give the same answer, and neither is an exception.
    return jsonb_build_object('left', false, 'notFound', true);
  end if;

  if v_game.phase <> 'lobby' then
    -- The seats come back so the caller can redraw a table it is still at.
    return jsonb_build_object(
      'left', false,
      'alreadyStarted', true,
      'revision', v_game.revision,
      'phase', v_game.phase,
      'seats', v_game.seats
    );
  end if;

  -- Was this device holding the host's chair? Asked BEFORE the removal, while
  -- the array still has the seat in it.
  v_was_host := v_game.host_seat_id is not null and exists (
    select 1
      from jsonb_array_elements(v_game.seats) as seat
     where seat ->> 'seatId' = v_game.host_seat_id
       and seat ->> 'deviceId' = p_device_id
  );

  select coalesce(
           jsonb_agg(seat order by seat ->> 'seatId'),
           '[]'::jsonb
         )
    into v_seats
    from jsonb_array_elements(v_game.seats) as seat
   where seat ->> 'deviceId' is distinct from p_device_id;

  if v_seats = v_game.seats then
    -- This device was not at the table. Idempotent rather than an error: a
    -- double-click, a retry after a timeout, and a device leaving a table it
    -- had already been evicted from all arrive here, and none of them is a
    -- fault. The revision is NOT bumped - nothing changed, and ringing the
    -- bell for it would wake every other device for nothing.
    return jsonb_build_object(
      'left', true,
      'revision', v_game.revision,
      'phase', v_game.phase,
      'seats', v_game.seats,
      'hostSeatId', v_game.host_seat_id
    );
  end if;

  if v_was_host then
    select seat ->> 'seatId'
      into v_next_host
      from jsonb_array_elements(v_seats) as seat
     order by seat ->> 'claimedAt', seat ->> 'seatId'
     limit 1;
  end if;

  update public.games
     set seats = v_seats,
         -- Null when the host left an empty table, which is exactly what 0005
         -- calls "no host recorded at all" and fails open on. There is nobody
         -- left to fail open TO, so it refuses anyway until somebody sits down.
         host_seat_id = case when v_was_host then v_next_host else host_seat_id end,
         -- The trap, closed. See the header: a moved chair with a live secret
         -- is a table nobody can start.
         host_secret = case when v_was_host then null else host_secret end,
         updated_at = now(),
         -- Every other device is watching the lobby off this. Without the bump
         -- the empty chair appears on their screen when the 30s poll comes
         -- round, which is the backstop and not the bell.
         revision = revision + 1
   where id = p_game_id
   returning * into v_game;

  return jsonb_build_object(
    'left', true,
    'revision', v_game.revision,
    'phase', v_game.phase,
    'seats', v_game.seats,
    'hostSeatId', v_game.host_seat_id
  );
end;
$$;

grant execute on function public.leave_seat(uuid, text, text) to anon, authenticated;
