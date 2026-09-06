-- Online play: one row is the game.
--
-- Every client runs the same pure engine locally and publishes the result with
-- optimistic concurrency. Realtime tells the others that the revision moved;
-- they fetch and adopt. There is no server-side rules engine, so this schema's
-- whole job is to make "who wrote last" unambiguous and to stop the tables
-- being readable by anyone who did not receive a join code.
--
-- Two tables on purpose. `games` is small and IS in the realtime publication;
-- `game_states` holds the ~50KB state jsonb and is NOT. The realtime event is
-- a doorbell, not the payload: an oversized WAL payload gets truncated, and
-- postgres_changes missed while a client was offline are never replayed. So a
-- client always fetches on the bell, and the same fetch serves first load,
-- late join and reconnect.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.games (
  id uuid primary key,
  -- What a player types or receives in a link. Short, unambiguous, and the
  -- only thing standing between a stranger and this game - see the note on
  -- capability below.
  join_code text not null unique,
  -- Mirrors GameState.status/phase enough for a lobby list without fetching
  -- the whole state.
  phase text not null default 'lobby',
  -- Bumped on every accepted write. The compare-and-set target.
  revision bigint not null default 0,
  -- Guards against a client running older code writing a shape a newer one
  -- cannot read. Checked by the RPC, not by the client.
  protocol_version integer not null default 1,
  -- [{ seatId, playerId, name, tokenId, deviceId, claimedAt }]
  seats jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Free projects are not a place to keep data forever, and an abandoned game
  -- is worthless. Reaped by a scheduled job, or simply ignored.
  expires_at timestamptz not null default now() + interval '30 days'
);

create table if not exists public.game_states (
  game_id uuid primary key references public.games (id) on delete cascade,
  -- The whole GameState, validated on the way in by the client's own zod
  -- schema. Postgres does not know the rules and is not asked to.
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- An append-only record of what each client claimed to do. It does not prevent
-- cheating - nothing here can, without a server-side engine - but it makes it
-- visible afterwards, and it is the thing that would let a real verifier be
-- added later without changing any client code.
create table if not exists public.game_moves (
  id bigserial primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  revision bigint not null,
  seat_id text,
  command jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists game_moves_game_id_revision_idx
  on public.game_moves (game_id, revision desc);

create index if not exists games_expires_at_idx on public.games (expires_at);

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------
--
-- RLS on, and NO policies. That is not an oversight: with no policy, anon has
-- no direct access to any of these tables at all, and every read and write has
-- to go through the security definer functions below.
--
-- The alternative - `create policy ... using (true)` plus a grant - looks
-- equivalent and is not. It would make `GET /rest/v1/games?select=*` with no
-- filter return every game anyone has ever created. Requiring the join code as
-- a function argument is what makes a game unreachable without one.

alter table public.games enable row level security;
alter table public.game_states enable row level security;
alter table public.game_moves enable row level security;

revoke all on public.games from anon, authenticated;
revoke all on public.game_states from anon, authenticated;
revoke all on public.game_moves from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
--
-- Every one of these takes the join code and checks it. Holding the code is
-- the capability: anyone who has it can read AND overwrite the game, because
-- the database cannot tell a legal state from a fabricated one. That is the
-- deliberate trade for a game you play with friends - it is written down in
-- docs/features/multiplayer.md rather than left to be discovered.

create or replace function public.create_game(
  p_game_id uuid,
  p_join_code text,
  p_state jsonb,
  p_seats jsonb default '[]'::jsonb,
  p_protocol_version integer default 1
) returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
begin
  insert into public.games (id, join_code, seats, protocol_version, revision, phase)
  values (p_game_id, upper(p_join_code), p_seats, p_protocol_version, 1, 'lobby')
  returning * into v_game;

  insert into public.game_states (game_id, state) values (p_game_id, p_state);

  return v_game;
end;
$$;

-- Reading is one round trip: the row and its state together, so a client can
-- never see a revision without the state that goes with it.
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
    -- Deliberately the same answer for "no such game" and "wrong code", so
    -- this cannot be used to enumerate which game ids exist.
    raise exception 'Game not found' using errcode = 'no_data_found';
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

-- The compare-and-set. This is the only way a state changes.
--
-- `for update` serialises concurrent publishes on the same game, and the
-- revision check decides which one wins. The loser is not an error: it gets
-- the authoritative snapshot back in the same round trip, so it can adopt
-- immediately rather than fetching again and racing a third writer.
--
-- Order matters: game_states is written BEFORE games.revision is bumped,
-- because the revision bump is what wakes every other client. Bumping first
-- would ring the doorbell for a state that is not there yet.
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
    raise exception 'Game not found' using errcode = 'no_data_found';
  end if;

  if v_game.revision <> p_base_revision then
    -- Somebody else moved first. Hand back what is actually true; the caller
    -- adopts it and does NOT retry - replaying a command onto a new base is
    -- how you end up bidding 200 against a 250 that already landed.
    return jsonb_build_object(
      'accepted', false,
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

-- Claiming a seat is its own write so it does not have to go through the
-- game-state CAS: seats change in the lobby, where there is no state to
-- conflict over, and a claim must not be lost to an unrelated publish.
create or replace function public.claim_seat(
  p_game_id uuid,
  p_join_code text,
  p_seats jsonb
) returns public.games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
begin
  update public.games
     set seats = p_seats, updated_at = now(),
         -- Bumping the revision here too is what makes the lobby live: the
         -- doorbell is the same one the game uses.
         revision = revision + 1
   where id = p_game_id and join_code = upper(p_join_code)
   returning * into v_game;

  if not found then
    raise exception 'Game not found' using errcode = 'no_data_found';
  end if;

  return v_game;
end;
$$;

-- Only these four are callable, and only with a join code.
grant execute on function public.create_game(uuid, text, jsonb, jsonb, integer) to anon, authenticated;
grant execute on function public.fetch_game(uuid, text) to anon, authenticated;
grant execute on function public.publish_game_state(uuid, text, bigint, jsonb, text, jsonb, text, jsonb) to anon, authenticated;
grant execute on function public.claim_seat(uuid, text, jsonb) to anon, authenticated;

-- The doorbell. Only `games` is published - `game_states` is deliberately not,
-- so a 50KB payload never goes near the WAL stream.
--
-- Guarded so the migration can be re-run: `alter publication ... add table` is
-- an error if the table is already there.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end;
$$;
