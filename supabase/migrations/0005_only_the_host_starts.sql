-- Only the person who opened the table may start it.
--
-- Everything else about a running game stays open to every seated device, and
-- that is not an oversight: docs/features/multiplayer.md records "not
-- host-authoritative" as a decision, because the host closing their laptop must
-- not end the game. So this adds exactly one authorisation rule, to exactly one
-- transition - lobby -> playing - and touches nothing after it.
--
-- WHY THE HOST IS NOT A DEVICE ID, stated rather than discovered:
--
-- `fetch_game` hands the whole seats array to anyone holding (id, code), and
-- every seat carries its `deviceId`. So a guest is GIVEN the host's device id
-- by the server; "prove you are the host by sending their device id" is a check
-- whose credential was published to everyone who could fail it. Against this
-- app's own client it holds; against a hand-rolled POST it is decoration, and
-- the requirement is a server rule rather than a hidden button.
--
-- Hence two columns doing two different jobs:
--
--   host_seat_id  WHO the host is. Public - and already derivable from the
--                 earliest `claimedAt` in an array every code-holder reads, so
--                 returning it discloses nothing new. It is what the lobby
--                 draws, and it follows the SEAT rather than the laptop.
--   host_secret   PROOF that you are them. Minted here, returned by
--                 `create_game` and by nothing else - not `fetch_game`, not
--                 `claim_seat`, not `find_game_by_code`. A value every device
--                 with the code can read is not a capability.
--
-- Not called a "token": `tokenId` meant a playing piece everywhere in this
-- codebase until the change that brought this migration, and a credential
-- sharing that word would be the drift docs/conventions.md exists to stop.
--
-- WHAT THIS CANNOT BE, in the voice 0004 established. Host-only start can never
-- be stronger than the join code, which is a bearer capability: a code-holder
-- can already overwrite a running game through `publish_game_state`. Which is
-- why that function gets a door below, and why the door - not the new function
-- - is the thing that actually closes the hole.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
--
-- Both nullable, and that is a decision. `not null default 'player-1'` was the
-- tempting version and it asserts a fact about rows where the fact is not
-- known; a mis-backfilled row would then claim a specific host rather than
-- admitting it has none. Null has a written meaning instead - the same choice
-- 0002 made about not-found - and every branch below says what it does with it.

alter table public.games
  add column if not exists host_seat_id text,
  add column if not exists host_secret uuid;

-- Lobbies that already exist. `create_game` inserts the host's seat first and
-- alone, so the earliest `claimedAt` IS the creator; the values are ISO-8601
-- strings, so lexical order is chronological order. Tie-broken on seatId, so a
-- row written inside one millisecond still backfills deterministically.
--
-- These rows get NO secret. See create_game for why minting one for a client
-- that will never hold it is worse than minting none.
update public.games
   set host_seat_id = (
         select seat ->> 'seatId'
           from jsonb_array_elements(seats) as seat
          order by seat ->> 'claimedAt', seat ->> 'seatId'
          limit 1
       )
 where host_seat_id is null
   and jsonb_array_length(seats) > 0;

-- ---------------------------------------------------------------------------
-- create_game: the host is the seat it was handed, not a claim
-- ---------------------------------------------------------------------------
--
-- No new parameter, deliberately. The host seat is DERIVED from `p_seats` here,
-- which is 0003's rule applied one function earlier - the client does not get
-- to say who the host is.
--
-- Returns jsonb rather than `public.games` now, so the secret comes back under
-- a camelCase key beside everything else and the shape matches what fetch_game
-- hands back. That is the move 0002 made on claim_seat, for the same reason.

drop function if exists public.create_game(uuid, text, jsonb, jsonb, integer);

create or replace function public.create_game(
  p_game_id uuid,
  p_join_code text,
  p_state jsonb,
  p_seats jsonb default '[]'::jsonb,
  p_protocol_version integer default 1
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_host_seat_id text;
  v_host_secret uuid;
begin
  select seat ->> 'seatId'
    into v_host_seat_id
    from jsonb_array_elements(p_seats) as seat
   order by seat ->> 'claimedAt', seat ->> 'seatId'
   limit 1;

  -- A secret only for a caller that knows to keep one.
  --
  -- A protocol-1 client never reads this body, so a secret minted for it is
  -- held by nobody - and `start_game` would then refuse the very host who
  -- opened the table, because the strongest branch of its check would be armed
  -- with a value no device has. Leaving it null puts those rows on the device
  -- branch instead, which is exactly right for a client that starts its games
  -- the old way anyway.
  --
  -- 2 is PROTOCOL_VERSION in multiplayer.thunks.ts. This is the first thing
  -- ever to read the column 0001 added "checked by the RPC, not by the client".
  --
  -- `gen_random_uuid()` is core since Postgres 13, so it resolves through
  -- pg_catalog despite `set search_path = public`.
  if p_protocol_version >= 2 then
    v_host_secret := gen_random_uuid();
  end if;

  insert into public.games (
    id, join_code, seats, protocol_version, revision, phase,
    host_seat_id, host_secret
  )
  values (
    p_game_id, upper(p_join_code), p_seats, p_protocol_version, 1, 'lobby',
    v_host_seat_id, v_host_secret
  )
  returning * into v_game;

  insert into public.game_states (game_id, state) values (p_game_id, p_state);

  return jsonb_build_object(
    'id', v_game.id,
    'joinCode', v_game.join_code,
    'phase', v_game.phase,
    'revision', v_game.revision,
    'protocolVersion', v_game.protocol_version,
    'seats', v_game.seats,
    'hostSeatId', v_game.host_seat_id,
    -- The ONLY place this value is ever returned. If it appears in a second
    -- function, it has stopped being a capability.
    'hostSecret', v_game.host_secret
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- fetch_game: says who the host is, never how to prove it
-- ---------------------------------------------------------------------------

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
    -- Everyone gets this, on purpose: the lobby marks the host on every device,
    -- and a guest is told why its own Start is missing rather than left to
    -- guess. It points at a seat the caller is already holding, and the same
    -- fact is already sitting in `claimedAt`. `host_secret` is NOT here.
    'hostSeatId', v_game.host_seat_id,
    'state', v_state
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- claim_seat: the host's chair is not free for the taking
-- ---------------------------------------------------------------------------
--
-- 0003 made a claim evict whoever was in the seat asked for. That is right for
-- every other seat and, the moment a seat id means authority, wrong for one of
-- them: any device could become the host by asking for player-1. Not only
-- maliciously - that is the 0003 race itself, a client acting before its first
-- fetch came back, whose surviving guard is the lobby's `phase !== null` gate.
--
-- The exception is the point of recording the host as a SEAT: a device holding
-- `host_secret` is the host on a new laptop, and it takes its own chair back,
-- evicting the stale device the way any other claim would.
--
-- Dropped first rather than overloaded: PostgREST resolves an RPC by argument
-- NAMES, and there are already two live signatures from 0002 and 0003 - a third
-- would make an old body match more than one and answer 300 Multiple Choices.

drop function if exists public.claim_seat(uuid, text, jsonb);
drop function if exists public.claim_seat(uuid, text, jsonb, integer);

create or replace function public.claim_seat(
  p_game_id uuid,
  p_join_code text,
  p_seat jsonb,
  p_max_players integer default 8,
  p_host_secret uuid default null
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

  if v_game.host_seat_id is not null
     and v_seat_id = v_game.host_seat_id
     and not coalesce(p_host_secret = v_game.host_secret, false)
     and exists (
       select 1
         from jsonb_array_elements(v_game.seats) as seat
        where seat ->> 'seatId' = v_game.host_seat_id
          and seat ->> 'deviceId' is distinct from v_device
     )
  then
    -- A value, not an exception - 0002's rule. The seats come back so the
    -- caller can redraw the table it was refused a chair at.
    return jsonb_build_object('hostSeatTaken', true, 'seats', v_game.seats);
  end if;

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
         revision = revision + 1
   where id = p_game_id
   returning * into v_game;

  return jsonb_build_object(
    'id', v_game.id,
    'joinCode', v_game.join_code,
    'phase', v_game.phase,
    'revision', v_game.revision,
    'seats', v_game.seats,
    'hostSeatId', v_game.host_seat_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- publish_game_state: the lobby door only opens from start_game
-- ---------------------------------------------------------------------------
--
-- This is the guard that actually closes the hole. Without it `start_game` is
-- decoration: any device holding the code publishes a state with phase
-- 'in_progress' over a lobby and has started the game - which is exactly how
-- this app's own client started games until now.
--
-- A PHASE check, not an identity check. This function never learns who the host
-- is, and it must not: once the row has left the lobby it behaves exactly as
-- 0002 left it, every seated device writes every move, and the host is not an
-- authority over the running game.
--
-- Scoped to protocol_version >= 2, which is to say to rows created by a client
-- that knows about `start_game`. A build already open in somebody's tab starts
-- its own tables the only way it knows how, and breaking that for a row it
-- created would turn a deploy into a lobby nobody can start. An old client that
-- meets a NEW row and tries to start is, by construction, a guest doing the
-- thing this migration exists to refuse.

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

  if v_game.phase = 'lobby'
     and coalesce(p_phase, v_game.phase) <> 'lobby'
     and v_game.protocol_version >= 2 then
    -- The lobby's own `state` goes back with it, deliberately: a client too old
    -- to have a word for this refusal reads `accepted: false` with a state and
    -- adopts, where its decoder rejects `{}` and it stays in the lobby. Silence
    -- would have let it navigate into a game the server does not have.
    return jsonb_build_object(
      'accepted', false,
      'notFound', false,
      'lobbyLocked', true,
      'revision', v_game.revision,
      'phase', v_game.phase,
      'seats', v_game.seats,
      'state', (select state from public.game_states where game_id = p_game_id)
    );
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

-- ---------------------------------------------------------------------------
-- start_game: the one write with an authorisation rule
-- ---------------------------------------------------------------------------
--
-- Its own function rather than a branch inside `publish_game_state`, for four
-- reasons worth writing down:
--
--   1. Publish is the hot path for every move. Teaching it who the host is is
--      how the host becomes an authority over a running game by accident.
--   2. THE PHASE IS THE COMPARE-AND-SET here. `phase = 'lobby'` is a one-way
--      door, so exactly one start can ever win - and a revision CAS would
--      instead refuse a start because an unrelated seat claim had bumped the
--      row. It also removes the read-then-publish `startOnlineGame` did purely
--      to learn a revision, and the window between the two.
--   3. A start can check something a move cannot: that the seats the caller
--      built its players from are still the seats on this row. The caller sends
--      the seat IDS it used, never the array - 0003's rule - and the server
--      compares.
--   4. Its refusals are not publish's. `notHost` is not a conflict and must not
--      be mapped onto one by a client whose whole command path reads
--      accepted/notFound/conflict.
--
-- It does NOT count the players. Two is a rule, `startBlockedReason` holds it,
-- and Postgres does not know the rules and is not asked to.

create or replace function public.start_game(
  p_game_id uuid,
  p_join_code text,
  p_state jsonb,
  p_phase text,
  p_seat_ids text[],
  p_device_id text,
  p_host_secret uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
  v_next_revision bigint;
  v_row_seat_ids text[];
  v_sent_seat_ids text[];
  v_is_host boolean;
begin
  -- A start that does not leave the lobby is a malformed call, not a refusal -
  -- the same standing 0003 gives a seat with no deviceId.
  if p_phase is null or p_phase = 'lobby' then
    raise exception 'A start has to leave the lobby'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_game from public.games
   where id = p_game_id and join_code = upper(p_join_code)
   for update;

  if not found then
    return jsonb_build_object('started', false, 'notFound', true);
  end if;

  if v_game.phase <> 'lobby' then
    -- Somebody started first. Hand back what is actually true, the way a
    -- publish conflict does, so the loser adopts the game that exists rather
    -- than the one it just built.
    return jsonb_build_object(
      'started', false,
      'alreadyStarted', true,
      'revision', v_game.revision,
      'phase', v_game.phase,
      'seats', v_game.seats,
      'state', (select state from public.game_states where game_id = p_game_id)
    );
  end if;

  v_is_host := case
    -- The real check. A code-holder cannot pass it, because this value was
    -- never sent to them.
    when v_game.host_secret is not null then
      coalesce(p_host_secret = v_game.host_secret, false)
    -- Transitional, for rows backfilled by this migration and for rows opened
    -- by a protocol-1 client. The device id is disclosed to every code-holder,
    -- so this branch stops an accident rather than an attack - and it is a
    -- lobby that already existed when the rule did not. Deletable once
    -- `expires_at` has retired every such row: 30 days from this migration.
    when v_game.host_seat_id is not null then
      exists (
        select 1
          from jsonb_array_elements(v_game.seats) as seat
         where seat ->> 'seatId' = v_game.host_seat_id
           and seat ->> 'deviceId' = p_device_id
      )
    -- No host recorded at all: a row with no seats, which the backfill could
    -- not read a creator out of. Fail OPEN to any seated device, because the
    -- alternative is a table that exists and can never be started.
    else
      exists (
        select 1
          from jsonb_array_elements(v_game.seats) as seat
         where seat ->> 'deviceId' = p_device_id
      )
  end;

  if not v_is_host then
    -- A value rather than an exception, so a guest pressing a button it should
    -- not have been offered is a refusal in the UI and not a 500 in the logs.
    -- Nothing about the host comes back with it that fetch_game did not already
    -- give this caller.
    return jsonb_build_object('started', false, 'notHost', true);
  end if;

  select coalesce(array_agg(seat ->> 'seatId' order by seat ->> 'seatId'), '{}')
    into v_row_seat_ids
    from jsonb_array_elements(v_game.seats) as seat;

  if p_seat_ids is not null then
    select coalesce(array_agg(seat_id order by seat_id), '{}')
      into v_sent_seat_ids
      from unnest(p_seat_ids) as seat_id;

    if v_row_seat_ids <> v_sent_seat_ids then
      -- Somebody sat down or moved while this game was being built, so its
      -- players are not this table's seats. Unlike a move, a start is safe to
      -- rebuild and send again: it is a construction from the current seats,
      -- not a command replayed onto a new base.
      return jsonb_build_object(
        'started', false,
        'seatsChanged', true,
        'revision', v_game.revision,
        'seats', v_game.seats
      );
    end if;
  end if;

  v_next_revision := v_game.revision + 1;

  -- State BEFORE the revision bump, 0001's ordering rule: the bump is what
  -- wakes every other client, and bumping first rings the doorbell for a state
  -- that is not there yet.
  update public.game_states
     set state = p_state, updated_at = now()
   where game_id = p_game_id;

  -- `phase = 'lobby'` again. The row lock already guarantees it; this is the
  -- statement that keeps the door shut if a future refactor drops the lock.
  update public.games
     set revision = v_next_revision,
         phase = p_phase,
         updated_at = now()
   where id = p_game_id
     and phase = 'lobby';

  -- The audit table exists to make afterwards visible, and "who started this
  -- table" is the one question it could not answer. Not an engine command:
  -- nothing replays game_moves, and a start is not in the dispatch table.
  insert into public.game_moves (game_id, revision, seat_id, command)
  values (
    p_game_id,
    v_next_revision,
    v_game.host_seat_id,
    jsonb_build_object('type', 'startGame', 'deviceId', p_device_id)
  );

  return jsonb_build_object(
    'started', true,
    'revision', v_next_revision,
    'phase', p_phase,
    'seats', v_game.seats,
    'hostSeatId', v_game.host_seat_id
  );
end;
$$;

-- Re-granted after the drops, and the new one added. Five now, not four.
grant execute on function public.create_game(uuid, text, jsonb, jsonb, integer) to anon, authenticated;
grant execute on function public.claim_seat(uuid, text, jsonb, integer, uuid) to anon, authenticated;
grant execute on function public.start_game(uuid, text, jsonb, text, text[], text, uuid) to anon, authenticated;
