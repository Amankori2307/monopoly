# Multiplayer — 🚧 in progress

Play from your own devices, anywhere. The hot-seat game is unchanged and remains the default.

**Status:** shipped. The transport, seats, turn gating and the lobby are built and verified against
the live project with two real browsers. Hosting is `#/host`, joining is `#/join` or an invite link,
and an online game can be rejoined after a reload.

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
| `find_game_by_code`  | Which table a code belongs to: the id and the phase, nothing else  |

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

## Joining by a typed code

`fetch_game` takes the game id **and** the code and matches on both, so a six-character code
addressed nothing: the only way in was a link carrying the id. That made "type the code I just read
you" impossible, which is the one way in that works when the two of you are in the same room.
`games.join_code` is already `not null unique`, so migration `0004` adds `find_game_by_code`.

**What it costs, stated rather than discovered.** The code was already the whole capability —
`fetch_game` hands the entire state to anyone holding (id, code) and `publish_game_state` lets them
overwrite it. What changes is the search space: a blind attacker used to need a uuid (122 bits) _and_
a code, and now needs only the code. That is 32^6 ≈ 1.07e9, and an attacker wanting _any_ table
rather than a specific one divides that by the number of live games. There is no rate limiting
available inside a `security definer` function.

Two mitigations are built in, and one deliberate omission:

- The function returns **the id and the phase and nothing else**. It is a resolver, not a second way
  to read a game: everything after it still takes the code, so a correct guess buys exactly what the
  code alone buys. It never leaks seats, state or revision.
- **Not-found stays a value**, the rule migration `0002` exists to establish, and it is one answer
  for every miss — a code that never existed, a deleted game, a wrong code. No shape of answer says
  "close".
- `pg_sleep` as a uniform delay was considered and left out: it buys about one order of magnitude,
  costs a connection slot per attempt (a DoS lever of its own against a free project), and an
  attacker parallelises to the pooler's limit anyway.

The one genuinely effective lever is **not** pulled: `createJoinCode(length = 6)` takes a length, and
`createJoinCode(8)` would be 40 bits — 1024× harder — with no schema change, because `join_code` is
`text`. It stays at six because that is what a person can read aloud, and existing games keep their
six-character codes either way. This is consistent with what this page already says: the join code is
a bearer capability, and this is a game for people who already trust each other. The payoff for a
successful brute force is the ability to vandalise a stranger's Monopoly board.

## Rejoining a table

An online game is saved locally like any other — `startOnlineGame` calls `saveGame` — so it has
always sat in the recent-games index. It could not be **played** from there: the join code lived only
in `seat.joinCode` and in the lobby URL's `?code=`, which the game URL does not carry, and
`restoreSeat` was exported and dispatched nowhere. So opening one loaded the state, attached no
session, and `resolveViewer` failed closed to Spectator — a frozen game on your own save, with
nothing on screen saying why.

- `monopoly.code.<gameId>.v1` holds the code per device, written on create (the host invents it and
  is never sent it), on join (after the row is proven, so a code that opens nothing is never kept)
  and on attach.
- [useTableRejoin](../../src/features/multiplayer/hooks/useTableRejoin.ts) puts the device back on
  the table on a cold load, from `useTableState`, before the doorbell subscription.
- Its idempotence guard is **`session.gameId`, read through a ref** — the only fact that answers
  "already attached" without reading `sessionEpoch`, `connection` or `seat.joinCode`, all of which
  the attach itself writes. Keying on any of those would make the handler cancel its own effect, and
  here that is worse than the bug `useLobby` hit: replacing a session _closes_ the previous one, so a
  loop would rebuild the socket every render.
- It checks `isOnlineEnabled()` **first**, because `attachOnlineSession` goes through
  `requireConfig()`, which throws — and a throw inside an effect reaches nothing but `ErrorBoundary`,
  so an online save opened on a build with no server would render as a crash.
- A save whose code this device never had says so (`TABLE_MESSAGES.codeLost`) and the saved-games
  list refuses to offer it, rather than opening a game with every control dead.

## Everything the table can say is in one place

`TABLE_MESSAGES` was written to hold these sentences so a refusal and the banner reporting it
could not diverge, and then they diverged anyway: `multiplayer.thunks` had grown byte-for-byte
copies of three of them plus one that differed by a single noun (`That game is no longer there.`
against the constant's `That table…`), and `JoinPage` had a third set with reassuring tails
appended. Four spellings of "we cannot find that game", and three of the constants dead. Every
one of them reads from the constant now; the tails were the best of the wordings, so they moved
into it. See [conventions.md](../conventions.md) section 3d.

## The table's own options

`useLobby.start()` hardcoded `themeId: availableThemes[0].id` and `useSpeedDie: false`, so every
online table was the first edition whatever the host wanted, and **an online game could never be a
Speed Die game**. The host picks both at `#/host` and they travel in the lobby URL beside the code
(`&theme=…&speed=on`), because the lobby is where the game is _started_ and a host reloading their
own lobby is routine — Redux would lose them. `inviteLinkFor` carries them too, and that is a
correctness fix rather than a nicety: seat tokens come from `theme.tokenCatalog`, so a guest whose
lobby defaulted to another edition picks a token id the host's board has no piece for.
