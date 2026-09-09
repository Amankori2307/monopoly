-- A code you can type, not just a link you can paste.
--
-- `createJoinCode` has always minted a six-character code from an alphabet with
-- no O/0/I/1, and InviteLink has always shown it, with a comment saying it is
-- for "when the person is standing next to you with their phone". There was
-- nowhere to type it: every RPC is keyed on the PAIR (id, code), so a code on
-- its own addressed nothing and the only way in was the full invite URL.
--
-- `games.join_code` is already `not null unique` (0001), so resolving a code to
-- a table is well defined.
--
-- WHAT THIS COSTS, stated rather than discovered:
--
-- The code was already the capability - `fetch_game` hands the entire game
-- state to anyone holding (id, code), and `publish_game_state` lets them
-- overwrite it. What changes is the search space. Before, an attacker needed a
-- uuid AND a code; now the code alone is enough, so the guessable space falls
-- to 32^6 = 1,073,741,824. There is no rate limiting available inside a
-- security definer function, and PostgREST offers none either, so this is a
-- real if modest weakening. It is consistent with what the design already
-- says out loud in docs/features/multiplayer.md - the join code is a bearer
-- capability and this is "a game for people who already trust each other" -
-- and a code lives only as long as one game.
--
-- Two mitigations are built in:
--
--   1. This returns the id and the phase and NOTHING else. It is a resolver,
--      not a second way to read a game: the client still has to call
--      fetch_game with the pair, so a guessed code costs a second round trip
--      and this function never leaks seats, state or revision.
--   2. Not-found stays a VALUE rather than an exception, the rule 0002 exists
--      to establish - so a wrong code is a typo in the UI instead of an HTTP
--      500 in the logs, and it is indistinguishable from a code for a game
--      that has been deleted.

create or replace function public.find_game_by_code(
  p_join_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games;
begin
  -- Upper-cased on the way in, exactly as every other RPC does it, so a code
  -- read aloud and typed in lower case still finds its table.
  select * into v_game from public.games
   where join_code = upper(p_join_code);

  if not found then
    return null;
  end if;

  -- The id and the phase only. The phase is here so the client can send a
  -- latecomer straight into a game already in progress rather than to a lobby
  -- that is gone - which is the same thing the invite link already does.
  return jsonb_build_object(
    'id', v_game.id,
    'phase', v_game.phase
  );
end;
$$;

grant execute on function public.find_game_by_code(text) to anon, authenticated;
