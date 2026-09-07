# Multiplayer — 🚧 in progress

Play from your own devices, anywhere. The hot-seat game is unchanged and remains the default.

**Status:** the transport is built and verified against the live project. Seats, turn gating and the
lobby are not — no UI reaches any of this yet.

## What you should know before using it

Three things are true by design and cannot be fixed without a real server. They are written here so
they are decided rather than discovered.

- **The join code is a bearer capability.** Anyone holding it can read _and overwrite_ the game. The
  database stores whatever state it is handed; it has no rules engine, so it cannot tell a legal
  state from a fabricated one. This is a game for people who already trust each other.
- **The card decks are visible.** `GameState.decks` holds the remaining Chance and Community Chest
  cards **in order**, and a draw takes `decks[name][0]`. Every player can therefore see the next card
  before it is drawn. This is already true of the local save; online merely shares it. Only
  server-held decks would fix it.
- **Dice are rolled by the client.** Optimistic local apply and server-authoritative dice are
  mutually exclusive: moving the roll to the server puts a visible round trip in front of every
  throw.

`game_moves` records every command with the seat that sent it. That does not prevent cheating — it
makes it visible afterwards.

## How it works

**The row is the game.** Every client runs the same pure engine locally and publishes the result with
optimistic concurrency. `publish_game_state` does a compare-and-set on `revision` under
`select … for update`; the loser is handed the authoritative snapshot in the same round trip, so it
adopts without racing a third writer.

**The engine is never awaited, and local persistence stays synchronous.** The network is a
replication layer beside the command path, not inside it — see CLAUDE.md §3.

### Two tables, because the bell is not the payload

`games` is small (`revision`, `phase`, `seats`). `game_states` holds the ~50 KB state jsonb. An
oversized realtime payload is truncated, and `postgres_changes` missed while offline is never
replayed — so a client is only ever told _that_ the revision moved, and fetches. One code path then
serves first load, late join and reconnect alike.

### The doorbell is broadcast, not `postgres_changes`

Realtime evaluates RLS before forwarding a row change, and `games` deliberately has RLS on with **no
policies** — so a `postgres_changes` channel subscribes happily and then delivers nothing. Verified
against the live project before the code was written.

Making it work would mean granting `anon` SELECT plus a permissive policy, which is exactly the hole
the RPC design closes: an unfiltered `GET /rest/v1/games` would list every game anyone ever created.

Broadcast touches no table, so it needs neither. The bell carries a revision only; the state comes
from `fetch_game`, which requires the join code — so a spoofed bell costs one redundant fetch and
discloses nothing. A 30-second poll is the backstop, because a socket that is up but has silently
stopped delivering is the failure these transports actually have.

### Access control

RLS on, no policies, no table grants — every call goes through a `security definer` RPC that takes
the join code. A wrong code and an unknown game id give the **same** answer, so game ids cannot be
enumerated. Not-found is a value rather than an exception: a mistyped code is a typo, not an HTTP 500.

| RPC                  | Does                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `create_game`        | Inserts the row and its state at revision 1                        |
| `fetch_game`         | Row + state in one round trip, or `null`                           |
| `publish_game_state` | The compare-and-set; the only way a state changes                  |
| `claim_seat`         | Seats, bumping the revision so the lobby is live off the same bell |

The **publishable** key ships in the bundle by design and is an identifier, not a secret. The
`sb_secret_` key bypasses RLS and appears nowhere.

## Files

| File                                    | Does                                                    |
| --------------------------------------- | ------------------------------------------------------- |
| `supabase/migrations/`                  | The schema, the RPCs, the access control                |
| `multiplayer/gameSession.interfaces.ts` | The seam: publish, fetch, subscribe, close              |
| `multiplayer/localSession.ts`           | Hot-seat: accepts every publish, does nothing           |
| `multiplayer/onlineSession.ts`          | The real one, over the four RPCs                        |
| `multiplayer/doorbell.ts`               | Broadcast subscribe/ring, realtime imported dynamically |
| `multiplayer/supabaseRpc.ts`            | The four calls, over plain `fetch` — no SDK             |
| `multiplayer/onlineConfig.utils.ts`     | Resolves config once; `null` means offline              |

## Decisions

- **A managed service, not WebRTC.** WebRTC still needs a signalling server, and a TURN relay on
  ~10–20% of networks. Its one advantage — low-latency direct transport — is worth nothing to a game
  sending a few hundred bytes every several seconds.
- **Not lockstep command replay.** `crypto.randomUUID()` and `new Date()` are called inside the
  engine, so peers would diverge on event ids and timestamps — and the sound cue keys off
  `events[0].id`.
- **Not host-authoritative.** The host closing their laptop would end the game and leave no artifact
  to resume from.
- **No SDK for the RPCs.** A PostgREST function call is a POST with two headers; the full client is
  ~28% of this app's bundle to wrap that. Only the socket needs a library, and it is imported
  dynamically so an offline player downloads none of it.
- **One publish in flight at a time** (to come, with the UI): at most one move can then be lost to a
  conflict, so there is never a divergent local branch to unwind.
