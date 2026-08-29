# CLAUDE.md

Guidance for Claude Code working in this repository.

> **Doc upkeep is part of every task.** See [Documentation contract](#documentation-contract).
> Deep architecture map: [docs/architecture.md](docs/architecture.md) · Ruleset source of truth: [docs/india-edition-rules.md](docs/india-edition-rules.md)

---

## 1. What this project is

A **Monopoly India Edition** board game in the browser: React 19 + TypeScript + Redux Toolkit, built with NX + Vite, saved to `localStorage`. Games have stable ids and are resumable via `/game/:gameId`.

The defining architectural decision: **the rules engine is a pure module that knows nothing about React or Redux.** UI dispatches *commands*; the engine returns a *new game state*. Keep it that way.

---

## 2. ⚠️ Two code trees — only one is alive

The app was rewritten. `src/` currently holds the new app **and** a fully disconnected legacy island.

| | Active (~3.1k LOC) | Legacy island (~2.9k LOC) |
|---|---|---|
| Paths | `src/domain/`, `src/features/`, `src/app/`, `src/components/game/`, `src/test/` | `src/redux/`, `src/utility/`, `src/components/monopoly/`, `src/components/home/`, `src/components/not_found/`, `src/assets/css/*.scss`, `src/assets/data/*.json` |
| Reachable from `src/App.tsx`? | Yes | **No** — verified zero import edges |
| Theme | India Edition | Zelda-themed (old) |
| State | RTK slices + pure engine | hand-rolled actions/reducers |

**Rules of engagement:**
- Build all new work in the active tree.
- Never import from the legacy island into active code, and never "fix" legacy files — they ship nothing.
- Treat any older doc describing Zelda spaces, `boardData.json`, `playerAppropriateActionUtils`, or `Monopoly.tsx` as **historical, not current**.
- Deleting the island is a deliberate, separate decision — confirm with the user first.

---

## 3. Architecture

```
src/App.tsx                      routes only
  └─ features/                   pages + redux slices (React-aware)
       setup/HomePage.tsx        create game, list/resume/delete saves
       game/GamePage.tsx         board render + decision panels
       game/gameSlice.ts         thunks: bridge UI ⇄ engine ⇄ storage
       game/uiSlice.ts           ephemeral UI state (auction bid input)
       rules/RulesPage.tsx       static rules booklet
       persistence/              localStorage + zod validation
  └─ components/game/            presentational, no store access
       DiceDock.tsx              dice animation + roll sound
       SpaceDetailCard.tsx       title-deed modal
  └─ domain/                     PURE — no React, no Redux, no DOM
       types/game.ts             single source of truth for all game types
       rules/gameEngine.ts       createGameState + executeGameCommand
       rules/rng.ts              RandomSource (Default / Seeded)
       board/, cards/, themes/   India Edition data
  └─ app/                        store wiring + typed hooks
```

**Dependency direction is one-way: `features` → `components`/`domain`; `domain` → nothing.** A `react` or `@reduxjs/toolkit` import inside `src/domain/` is always a bug.

### Data flow for one player action

```
UI event → dispatch(runGameCommand({type:'rollTurnDice'}))   features/game/gameSlice.ts
        → executeGameCommand(state, command, randomSource)    domain/rules/gameEngine.ts  (pure)
        → { nextState, uiHints }
        → saveGame(nextState)                                 features/persistence
        → setActiveGame(nextState) → React re-renders
```

Every command runs through `runGameCommand`. Do not mutate game state in a component or a reducer — add a command to the engine instead.

---

## 4. The game engine contract

`executeGameCommand(state, command, randomSource) → { nextState, events, saveRequired, uiHints }`

- **Immutable**: every helper returns a new state object; nothing is mutated in place.
- **Deterministic** given a `RandomSource` — *except* `crypto.randomUUID()` and `new Date()`, which are called directly inside the engine. Tests use `SeededRandomSource` for dice.
- **Throws** on invalid commands (e.g. rolling out of phase). Callers currently do **not** catch — an invalid dispatch surfaces as an uncaught error.

### Turn phases
`await_roll → resolving_movement → resolving_space → await_decision → await_extra_roll_or_end → turn_complete`

### Commands
| Implemented | Scaffolded (returns a `uiHints` placeholder, changes nothing) |
|---|---|
| `rollTurnDice`, `buyLandedAsset`, `declineLandedAsset`, `submitAuctionBid`, `passAuction`, `payJailFine`, `useJailFreeCard`, `attemptJailRoll`, `endTurn` | `buildHouse`, `buildHotel`, `sellHouse`, `sellHotel`, `mortgageAsset`, `unmortgageAsset`, `proposeTrade`, `acceptTrade`, `rejectTrade`, `confirmBankruptcy` |

### Locked economics (`gameEngine.ts` constants)
Starting cash `M1500` · pass GO `M200` · jail fine `M50` · auction opens at `M10`, min increment `1` · 40 spaces · 32 houses / 12 hotels · history capped at 120 events, newest first.

Money values live in `domain/board/` and `gameEngine.ts` constants — never hardcode an amount in a component.

---

## 5. Persistence

- Keys: index `monopoly.games.index.v1`, per game `monopoly.game.<id>.v1`.
- `GAME_STATE_VERSION = 1`. **Bump it and add a migration whenever `GameState` changes shape**, or saved games break on load.
- Loads are validated with zod (`features/persistence/schema.ts`). The schema is deliberately loose in places (`z.any()` for players/board/ownership) — tighten it alongside any shape change.
- Every command save is a full-state write, then the index is rewritten sorted by `updatedAt`.

---

## 6. Commands

```bash
pnpm dev          # Vite dev server on :3000
pnpm build        # production build → build/
pnpm test         # vitest (src/**/*.test.{ts,tsx})
pnpm test:e2e     # playwright (tests/e2e), auto-starts dev server
pnpm lint         # eslint via nx
pnpm fix-all      # eslint --fix + prettier write
pnpm deploy       # gh-pages → build/
```

Typecheck with `npx tsc --noEmit`. **Baseline as of the last verified run: `tsc` clean, 5/5 unit tests passing.** Keep it that way — if you land a change, re-run both.

---

## 7. Conventions

**Modularity**
- `domain/` stays pure. UI-only concerns (colors, icons, copy) never leak into it.
- `components/game/` are presentational: props in, callbacks out, no `useAppSelector`.
- Slices hold state; *thunks* hold orchestration. Business rules belong in the engine.
- Path aliases exist in `tsconfig.json` (`@app/*`, `@domain/*`, `@features/*`, `@components/*`, `@test/*`) but **nothing uses them yet** — the codebase is uniformly relative-import. Pick one style deliberately rather than mixing.

**DRY — known duplication, fix on contact**
| Duplicated | Locations |
|---|---|
| Street colour-group hex map (8 entries) | [GamePage.tsx:56](src/features/game/GamePage.tsx:56), [SpaceDetailCard.tsx:28](src/components/game/SpaceDetailCard.tsx:28) |
| Electric-Company / Super-Tax icon ternary | [GamePage.tsx:283](src/features/game/GamePage.tsx:283), [SpaceDetailCard.tsx:43](src/components/game/SpaceDetailCard.tsx:43) |
| `availableThemes.find(...)` theme lookup | [gameEngine.ts:37](src/domain/rules/gameEngine.ts:37), [GamePage.tsx:82](src/features/game/GamePage.tsx:82), [HomePage.tsx:52](src/features/setup/HomePage.tsx:52) |
| `kind === 'street' \|\| 'railway' \|\| 'utility'` inline check (a `propertySpaceKinds` set already exists in the engine) | [gameEngine.ts:507](src/domain/rules/gameEngine.ts:507), [gameEngine.ts:676](src/domain/rules/gameEngine.ts:676), [GamePage.tsx:119](src/features/game/GamePage.tsx:119) |
| `theme?.currencySymbol ?? 'M'` — 5× in one file; a `formatMoney` helper exists but only in `SpaceDetailCard` | GamePage.tsx |

When you touch one of these, extract it (colors/icons → a shared board-presentation module; `formatMoney` + `isPropertySpace` → shared helpers) rather than adding a sixth copy.

**Styling** — the active app uses one plain stylesheet, `src/app/app.css`, imported once in `App.tsx`. The `.scss` modules under `src/assets/css/` belong to the legacy island.

**Testing** — engine logic gets a `SeededRandomSource` unit test; pages get a React Testing Library test via `src/test/renderWithProviders.tsx`; user-visible flows get a Playwright spec.

---

## 8. Known gaps and traps

- **Jail-fine bug**: [gameEngine.ts:767](src/domain/rules/gameEngine.ts:767) — `payJailFine` calls `resolveBankPayment`, which sets an `asset-liquidation` pending decision when the player can't afford `M50`; lines 773-781 then overwrite `pendingDecision` back to `none`, so a broke player leaves jail without paying.
- **`GameCommandResult.events` returns the entire `history`**, not the events from this command ([gameEngine.ts:899](src/domain/rules/gameEngine.ts:899)). `saveRequired` is hardcoded `true`.
- **No end condition**: `winnerPlayerId`, `status: 'completed'`, and the `game-over` decision are never set — games run forever.
- **Bank inventory is cosmetic**: `housesAvailable`/`hotelsAvailable` are never decremented (building isn't implemented).
- **Mortgaged properties** are skipped for rent but there is no way to mortgage yet.
- `tsconfig.json` has `strict: false` and `target: es5` — a deliberate gradual-migration holdover, not an endorsement.

---

## Documentation contract

Docs here are load-bearing: `CLAUDE.md` is read into context every session, so a stale line actively misleads. **Update docs in the same change as the code**, not afterwards.

| If you change… | Update |
|---|---|
| Engine commands, phases, or constants | §4 above |
| `GameState` shape or storage keys | §5 + bump `GAME_STATE_VERSION` + zod schema |
| Layer boundaries, new directory | §3 + `docs/architecture.md` |
| Ruleset behaviour or values | `docs/india-edition-rules.md` |
| Scripts in `package.json` | §6 |
| Fixing/adding duplication or a known bug | the §7 DRY table / §8 list — remove rows you resolve |
| Deleting part of the legacy island | §2 |

Before finishing a task: re-read the sections you touched, delete anything now false, and re-run `npx tsc --noEmit` + `pnpm test`.
