# Persistence and resume

**Status:** Shipped
**Entry points:** [src/features/persistence/persistence.ts](../../src/features/persistence/persistence.ts), [schema.ts](../../src/features/persistence/schema.ts)

## What it does

Every game is saved to `localStorage` after every command, so closing the tab loses nothing.
Games have stable ids and live at `#/game/:gameId`, which makes them resumable by URL. The hash
is load-bearing on GitHub Pages - see the routing note in CLAUDE.md §8.

## How it works

Two storage shapes:

| Key                       | Holds                                                           |
| ------------------------- | --------------------------------------------------------------- |
| `monopoly.games.index.v1` | Array of `StoredGameIndexEntry` — summaries for the home screen |
| `monopoly.game.<id>.v1`   | The full `GameState`                                            |

`saveGame` writes the full state, then rebuilds the index sorted by `updatedAt` descending.
`loadGame` and `loadGameIndex` parse through zod and **throw** on a mismatch; `gameSlice` catches
and surfaces `loadError` rather than crashing the page.

## Key decisions

- **Save the whole state, every command.** Simple and correct; game states are small. Deltas or
  an event log would be premature.
- **A separate index** so the home screen never parses full states just to list saves.
- **Validate on read, not on write.** Data written by this version is trusted; data read back may
  come from an older build or a hand-edited store.
- **The board is serialised into each save.** A resumed game keeps the board it started with, so
  editing `indiaEditionBoard.ts` does not retroactively change games in progress.

## State and data

`GAME_STATE_VERSION` is currently `12`. **Any change to the `GameState` shape must bump it and add
a migration**, or existing saves fail to load. Migrations live in
[migrations.ts](../../src/features/persistence/migrations.ts), keyed by the version they upgrade
_from_, and run **before** validation — the schema describes the current shape, so an older save
has to be made current first or it fails to parse and the game is lost.

The zod schema is **tight**, and was not always: `players`, `board` and `ownership` were
`z.record(z.any())` / `z.array(z.any())`, so corruption inside them went undetected. They are now
described in full, the board as a discriminated union of space kinds, with three cross-field checks
(40 spaces, `activePlayerIndex` in range, `playerOrder` naming players that exist). `pendingDecision`
is a full discriminated union too — it used to be `.passthrough()`, which was the one hole a peer
could hang arbitrary keys off a decision through.

**A new top-level field is silently stripped on load.** `gameStateSchema` is a plain `z.object`,
which drops unknown keys, so a field added to `GameState` and not to the schema will not survive a
save. The exception is a field given a `.default()` — `PlayerState.isBot` is one, so a hand-edited
or older save still parses.

## Tests

| Level       | File                                                                                              | Covers                                                          |
| ----------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Unit        | [schema.test.ts](../../src/features/persistence/schema.test.ts)                                   | What the schema accepts and what it refuses, field by field     |
| Unit        | [migrations.test.ts](../../src/features/persistence/migrations.test.ts)                           | Every migration, and a future version passing through untouched |
| Unit        | [decodeGameState.test.ts](../../src/features/persistence/decodeGameState.test.ts)                 | One decoder for disk and network: migrate, then validate        |
| Unit        | [persistence.errors.test.ts](../../src/features/persistence/persistence.errors.test.ts)           | A corrupt save, and a browser with storage blocked              |
| Unit        | [indexTableMode.test.ts](../../src/features/persistence/indexTableMode.test.ts)                   | An index entry written by an older build still lists its games  |
| Integration | [persistence.integration.test.ts](../../src/features/persistence/persistence.integration.test.ts) | Round trip, index projection, delete                            |
| Integration | [gameSlice.integration.test.ts](../../src/features/game/gameSlice.integration.test.ts)            | Thunk → engine → `localStorage`, asserted on both               |
| E2E         | [tests/e2e/navigation.spec.ts](../../tests/e2e/navigation.spec.ts)                                | Resuming a saved game from the front door                       |

## Known gaps

- Nothing outstanding. The schema is tight — a corrupt player, a malformed space or an unknown
  card effect is refused at the boundary rather than crashing a component later, and `ErrorBoundary`
  catches whatever still gets through. Migrations run on load and write the upgraded save back;
  `StorageWriteError` turns a full quota or a private-mode refusal into something the UI can say,
  and a failed save no longer costs the player the move they just made.
