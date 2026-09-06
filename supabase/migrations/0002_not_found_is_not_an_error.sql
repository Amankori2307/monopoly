-- A wrong join code is a typo, not a server fault.
--
-- 0001 raised an exception when a game could not be matched. PostgREST turns
-- that into HTTP 500 with SQLSTATE P0002, which is wrong twice over: it fills
-- the project's logs with 5xx for the most ordinary thing a player can do -
-- mistype a code - and it leaves the client unable to tell "no such game" from
-- "the backend is broken", which are opposite things to show someone.
--
-- Found by calling the RPCs against the real project; a local Postgres cannot
-- show it, because the status code is PostgREST's translation, not Postgres'.
--
-- So: not-found is now a value, not an exception. Every one of these still
-- gives the SAME answer for a wrong code and an unknown id, so game ids stay
-- unenumerable.

create or replace function public.fetch_game(
  p_game_id uuid,
  p_join_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_state jsonb;
begin
  select * into v_game from public.games
   where id = p_game_id and join_code = upper(p_join_code);

  if not found then
    return null;
  end if;

  select state into v_state from public.game_states where game_id = p_game_id;

  return jsonb_build_object(
    'id', v_game.id,
    'joinCode', v_game.join_code,
    'phase', v_game.phase,
    'revision', v_game.revision,
    'protocolVersion', v_game.protocol_version,
    'seats', v_game.seats,
    'state', v_state
  );
end;
$$;

create or replace function public.publish_game_state(
  p_game_id uuid,
  p_join_code text,
  p_base_revision bigint,
  p_state jsonb,
  p_phase text default null,
  p_seats jsonb default null,
  p_seat_id text default null,
  p_command jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_next_revision bigint;
begin
  select * into v_game from public.games
   where id = p_game_id and join_code = upper(p_join_code)
   for update;

  if not found then
    -- Distinct from a conflict on purpose. A conflict means "adopt what came
    -- back"; this means "stop, this game is not yours to write to".
    return jsonb_build_object('accepted', false, 'notFound', true);
  end if;

  if v_game.revision <> p_base_revision then
    return jsonb_build_object(
      'accepted', false,
      'notFound', false,
      'revision', v_game.revision,
      'phase', v_game.phase,
      'seats', v_game.seats,
      'state', (select state from public.game_states where game_id = p_game_id)
    );
  end if;

  v_next_revision := v_game.revision + 1;

  update public.game_states
     set state = p_state, updated_at = now()
   where game_id = p_game_id;

  update public.games
     set revision = v_next_revision,
         phase = coalesce(p_phase, phase),
         seats = coalesce(p_seats, seats),
         updated_at = now()
   where id = p_game_id;

  if p_command is not null then
    insert into public.game_moves (game_id, revision, seat_id, command)
    values (p_game_id, v_next_revision, p_seat_id, p_command);
  end if;

  return jsonb_build_object('accepted', true, 'revision', v_next_revision);
end;
$$;

-- Returns jsonb now rather than the table row, so "not found" can be null
-- without a 500 - and so the shape matches what fetch_game hands back.
drop function if exists public.claim_seat(uuid, text, jsonb);

create or replace function public.claim_seat(
  p_game_id uuid,
  p_join_code text,
  p_seats jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
begin
  update public.games
     set seats = p_seats,
         updated_at = now(),
         -- The lobby is live off the same doorbell the game uses.
         revision = revision + 1
   where id = p_game_id and join_code = upper(p_join_code)
   returning * into v_game;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_game.id,
    'joinCode', v_game.join_code,
    'phase', v_game.phase,
    'revision', v_game.revision,
    'seats', v_game.seats
  );
end;
$$;

grant execute on function public.claim_seat(uuid, text, jsonb) to anon, authenticated;

-- The row left behind by verifying 0001 against the live project.
delete from public.games where id = '0000dead-beef-4000-8000-000000000001';
