# Persistence and resume

**Status:** Shipped
**Entry points:** [src/features/persistence/persistence.ts](../../src/features/persistence/persistence.ts), [schema.ts](../../src/features/persistence/schema.ts)

## What it does
Every game is saved to `localStorage` after every command, so closing the tab loses nothing.
Games have stable ids and live at `/game/:gameId`, which makes them resumable by URL.

## How it works
Two storage shapes:

| Key | Holds |
|---|---|
| `monopoly.games.index.v1` | Array of `StoredGameIndexEntry` — summaries for the home screen |
| `monopoly.game.<id>.v1` | The full `GameState` |

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
`GAME_STATE_VERSION` is currently `1`. **Any change to the `GameState` shape must bump it and add
a migration**, or existing saves fail to load.

The zod schema is deliberately loose in places — `players`, `board`, and `ownership` are
`z.record(z.any())` / `z.array(z.any())`, so corruption inside them is not detected. Tighten
these alongside any shape change.

## Tests
| Level | File | Covers |
|---|---|---|
| Unit | — | *Gap: no tests at all. Round trip, index projection, delete, and the throw-on-corrupt path are all uncovered.* |
| Integration | — | *Gap: no thunk-level test that a command actually persists.* |
| E2E | — | *Gap: no reload-and-resume journey.* |

## Known gaps
- Zero direct test coverage — the highest-value gap in the repo.
- No storage-quota or private-mode handling; `localStorage` throwing would surface as an
  uncaught error.
- No migration mechanism exists yet, only the version field to hang one on.
