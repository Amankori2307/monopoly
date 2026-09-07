-- A seat claim must not be able to overwrite the table.
--
-- 0001's claim_seat took the whole seats array and stored it. That makes every
-- claim a last-writer-wins overwrite of everybody: a client that had not
-- finished loading the lobby sent an array containing only itself, and the
-- other players simply vanished. Found with two real browsers, where the guest
-- claimed a moment before its first fetch came back and deleted the host.
--
-- The fix is to stop trusting the client with the whole list. It sends one
-- seat; the merge happens here, under the row lock, so two people claiming at
-- the same instant cannot lose each other.

drop function if exists public.claim_seat(uuid, text, jsonb);

create or replace function public.claim_seat(
  p_game_id uuid,
  p_join_code text,
  p_seat jsonb,
  p_max_players integer default 8
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_seats jsonb;
  v_device text := p_seat ->> 'deviceId';
  v_seat_id text := p_seat ->> 'seatId';
begin
  if v_device is null or v_seat_id is null then
    raise exception 'A seat needs a deviceId and a seatId'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_game from public.games
   where id = p_game_id and join_code = upper(p_join_code)
   for update;

  if not found then
    return null;
  end if;

  -- Drop whatever this device held before - a claim is a move, not a second
  -- seat - and anyone else sitting in the seat it is taking.
  select coalesce(
           jsonb_agg(seat order by seat ->> 'seatId'),
           '[]'::jsonb
         )
    into v_seats
    from jsonb_array_elements(v_game.seats) as seat
   where seat ->> 'deviceId' is distinct from v_device
     and seat ->> 'seatId' is distinct from v_seat_id;

  if jsonb_array_length(v_seats) >= p_max_players then
    return jsonb_build_object('full', true, 'seats', v_game.seats);
  end if;

  v_seats := v_seats || jsonb_build_array(p_seat);

  update public.games
     set seats = v_seats,
         updated_at = now(),
         -- The lobby is live off the same doorbell the game uses.
         revision = revision + 1
   where id = p_game_id
   returning * into v_game;

  return jsonb_build_object(
    'id', v_game.id,
    'joinCode', v_game.join_code,
    'phase', v_game.phase,
    'revision', v_game.revision,
    'seats', v_game.seats
  );
end;
$$;

grant execute on function public.claim_seat(uuid, text, jsonb, integer) to anon, authenticated;

-- Rows left behind by verifying the RPCs against the live project.
delete from public.games where join_code in ('LIVE01', 'PROBE1', 'SEATS1');
