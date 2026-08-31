# CLAUDE.md

Guidance for Claude Code working in this repository.

> **Every change ships with unit + integration + e2e tests, and updates its docs.**
> Binding rules: [docs/coding-guidelines.md](docs/coding-guidelines.md) — read before writing code.
> **Lost? Start with [docs/file-index.md](docs/file-index.md)** — one line per file, what each one does.
>
> [Conventions](docs/conventions.md) · [Architecture](docs/architecture.md) · [Features](docs/features/README.md) · [Theming](docs/theming.md) · [Ruleset](docs/india-edition-rules.md) · [Documentation contract](#documentation-contract)

---

## 1. What this project is

A **Monopoly India Edition** board game in the browser: React 19 + TypeScript + Redux Toolkit, built with NX + Vite, saved to `localStorage`. Games have stable ids and are resumable via `/game/:gameId`.

The defining architectural decision: **the rules engine is a pure module that knows nothing about React or Redux.** UI dispatches _commands_; the engine returns a _new game state_. Keep it that way.

---

## 2. ⚠️ Two code trees — only one is alive

The app was rewritten. `src/` currently holds the new app **and** a fully disconnected legacy island.

|                               | Active (~3.1k LOC)                                                              | Legacy island (~2.9k LOC)                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paths                         | `src/domain/`, `src/features/`, `src/app/`, `src/components/game/`, `src/test/` | `src/redux/`, `src/utility/`, `src/components/monopoly/`, `src/components/home/`, `src/components/not_found/`, `src/assets/css/*.scss`, `src/assets/data/*.json` |
| Reachable from `src/App.tsx`? | Yes                                                                             | **No** — verified zero import edges                                                                                                                              |
| Theme                         | India Edition                                                                   | Zelda-themed (old)                                                                                                                                               |
| State                         | RTK slices + pure engine                                                        | hand-rolled actions/reducers                                                                                                                                     |

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
  └─ styles/                     SCSS: tokens, themes, components, pages
       main.scss                 the one stylesheet App.tsx imports
       themes/_themes.scss       theme engine -> [data-theme] custom properties
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
- **Deterministic** given a `RandomSource` — _except_ `crypto.randomUUID()` and `new Date()`, which are called directly inside the engine. Tests use `SeededRandomSource` for dice.
- **Throws** on invalid commands (e.g. rolling out of phase). Callers currently do **not** catch — an invalid dispatch surfaces as an uncaught error.

### Turn phases

`await_roll → resolving_movement → resolving_space → await_decision → await_extra_roll_or_end → turn_complete`

Landing on Chance or Community Chest draws the card and stops in `await_decision`; the effect is
applied by `acknowledgeCard`. A new decision type must also be added to `BLOCKING_DECISIONS`
(`gameView.selectors.ts`) or the player can roll straight past its modal.

### Commands

| Implemented                                                                                                                                                                                                                    | Scaffolded (returns a `uiHints` placeholder, changes nothing)                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `rollTurnDice`, `buyLandedAsset`, `declineLandedAsset`, `submitAuctionBid`, `passAuction`, `payJailFine`, `useJailFreeCard`, `attemptJailRoll`, `acknowledgeCard`, `mortgageAsset`, `unmortgageAsset`, `settleDebt`, `endTurn` | `buildHouse`, `buildHotel`, `sellHouse`, `sellHotel`, `proposeTrade`, `acceptTrade`, `rejectTrade`, `confirmBankruptcy` |

### Locked economics (`gameEngine.ts` constants)

Starting cash `₹1500` · pass GO `₹200` · jail fine `₹50` · auction opens at `₹10`, min increment `1` · 40 spaces · 32 houses / 12 hotels · history capped at 120 events, newest first.

Money moves through exactly two choke points, and both log an event: `resolveBankPayment` (out) and
`creditFromBank` (in). Add a third and feedback silently stops working for it.

**`doublesCount`, not `canRollAgain`, is what survives a blocking decision** — `resolveCurrentSpace`
sets `canRollAgain: false` while one is pending. Restore the phase with `resumeTurnAfterDecision`;
anything reading `canRollAgain` back after a decision silently eats the player's extra roll.

Money values live in `domain/board/` and `gameEngine.ts` constants — never hardcode an amount in a component.

---

## 5. Persistence

- Keys: index `monopoly.games.index.v1`, per game `monopoly.game.<id>.v1`.
- `GAME_STATE_VERSION = 1`. **Bump it and add a migration whenever `GameState` changes shape**, or saved games break on load.
- Loads are validated with zod (`features/persistence/schema.ts`). The schema is deliberately loose in places (`z.any()` for players/board/ownership) — tighten it alongside any shape change.
- **A new top-level `GameState` field is silently stripped on load**: `gameStateSchema` is a plain `z.object`, which drops unknown keys. `pendingDecision` is `.passthrough()`, so a decision's own payload survives — which is why the drawn Chance / Community Chest card rides inside the decision rather than in a field of its own. Add the field to the schema, or put it where it will survive.
- Every command save is a full-state write, then the index is rewritten sorted by `updatedAt`.

---

## 6. Commands

```bash
pnpm dev          # Vite dev server on :3000
pnpm build        # production build → build/
pnpm test         # vitest (src/**/*.test.{ts,tsx})
pnpm test:e2e     # playwright (tests/e2e), auto-starts dev server
pnpm lint         # eslint (config: .eslintrc.json)
pnpm fix-all      # eslint --fix + prettier write
pnpm deploy       # gh-pages → build/
```

Typecheck with `npx tsc --noEmit`. **Baseline as of the last verified run: `tsc` clean, eslint clean, 5/5 unit tests passing, `nx build` succeeds.** Keep it that way — re-run all of them before reporting a change done.

---

## 7. Conventions

**Modularity**

- `domain/` stays pure. UI-only concerns (colors, icons, copy) never leak into it.
- `components/game/` are presentational: props in, callbacks out, no `useAppSelector`.
- Slices hold state; _thunks_ hold orchestration. Business rules belong in the engine.
- **Enums live in `*.enums.ts`; exported interfaces and type aliases in `\*.interfaces.ts.** Machine-enforced by `no-restricted-syntax`. Component `Props`, hook `Use*Result`/`Use*Options`, and type aliases derived from a value in the same file are exempt — see [docs/conventions.md](docs/conventions.md) §1, which also explains why the rule must stay in a single `overrides` entry.
- Path aliases exist in `tsconfig.json` (`@app/*`, `@domain/*`, `@features/*`, `@components/*`, `@test/*`) but **nothing uses them yet** — the codebase is uniformly relative-import. Pick one style deliberately rather than mixing.

**DRY — known duplication, fix on contact**
| Duplicated | Locations |
|---|---|
| `availableThemes.find(...)` theme lookup | [gameEngine.ts:37](src/domain/rules/gameEngine.ts:37), [GamePage.tsx:63](src/features/game/GamePage.tsx:63), [HomePage.tsx:48](src/features/setup/HomePage.tsx:48) |
| Two fallbacks for one value: `DEFAULT_CURRENCY_SYMBOL` (`game.constants.ts`) and `getThemeOrDefault(...).currencySymbol` (`gameEngine.ts`) | both resolve the currency symbol independently |

_Resolved:_ the duplicated street colour-group hex maps are gone — colours are now theme tokens with generated `.group-*` classes (see [docs/theming.md](docs/theming.md)).

When you touch one of these, extract it (colors/icons → a shared board-presentation module; `formatMoney` + `isPropertySpace` → shared helpers) rather than adding a sixth copy.

**Styling** — SCSS under `src/styles/`, entry `main.scss`, imported once in `App.tsx`. Layered: `abstracts` (tokens, mixins) → `themes` → `base` → `layout` → `components` → `pages`.

- **Never hardcode a colour.** Every colour is a CSS custom property emitted by the theme engine; use `var(--accent)`, `var(--surface-panel)`, etc. A raw hex in a component partial breaks theming. The one sanctioned exception is a **player token colour**, applied inline from `ThemeToken.color` — it is theme _data_, not a CSS token. See `BoardTokenLayer`, `PlayerCard`, and the board's owner dot.
- Themes are token maps in `themes/_themes.scss`, emitted as `[data-theme="<id>"]` blocks. A compile-time guard fails the build if a theme misses a contract token. See [docs/theming.md](docs/theming.md).
- The `.scss` modules under `src/assets/css/` belong to the legacy island — do not add to them.

**Testing — mandatory, all three levels.** Every feature, entity, and behaviour ships with **unit + integration + e2e** coverage in the same change. Unit: pure logic, `SeededRandomSource` for dice, cover every `throw` branch. Integration: thunk → engine → persistence → store, and pages via `src/test/renderWithProviders.tsx`. E2E: the user journey in Playwright, queried by accessible role and name.

Full definition of done, per-layer patterns, and the current coverage gap: [docs/coding-guidelines.md](docs/coding-guidelines.md). Three harness blockers (no ESLint config, singleton test store, no `localStorage` reset) are listed there and need fixing before the integration mandate is fully achievable.

---

## 8. Known gaps and traps

- **`GameCommandResult.events` returns the entire `history`**, not the events from this command ([gameEngine.ts:1149](src/domain/rules/gameEngine.ts:1149)). `saveRequired` is hardcoded `true`. Anything wanting "what just happened" must diff `history` instead — see `selectNewEvents` in [toastFeed.utils.ts](src/features/game/toastFeed.utils.ts).
- **No end condition**: `winnerPlayerId`, `status: 'completed'`, and the `game-over` decision are never set — games run forever.
- **Bank inventory is cosmetic**: `housesAvailable`/`hotelsAvailable` are never decremented (building isn't implemented).
- **`asset-liquidation` is resolvable.** `settleDebt` clears it; mortgaging is how the cash is raised, and it deliberately leaves `pendingDecision` alone. What remains: only one liquidation can be pending, so several debts from one card still stop at the first — that needs a debt queue, with bankruptcy.
- **Several debts from one card are not all recorded.** The loops read `nextState` correctly now, but only one `asset-liquidation` can be pending, so they stop at the first player who cannot pay.
- **A mortgaged property still counts toward colour-set completeness and the railway/utility counts** — deliberate, and matches the printed rule.
- **A used Get Out of Jail Free card never returns to its deck.** `jailFreeCards` is a count with no record of which deck the card came from, so both can leave circulation permanently. Fixing it is a `GameState` shape change.
- **`advanceToNextTurn` does not skip bankrupt players** — latent only because bankruptcy is never set.
- **`movePlayerTo`'s pass-GO test is `nextPosition < player.position`**, true for any backward move. Safe only because `MoveSteps` always passes `collectGo: false`.
- `tsconfig.json` has `strict: false` and `target: es5` — a deliberate gradual-migration holdover, not an endorsement.

---

## Documentation contract

Docs here are load-bearing: `CLAUDE.md` is read into context every session, so a stale line actively misleads. **Update docs in the same change as the code**, not afterwards.

| If you change…                                  | Update                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Engine commands, phases, or constants           | §4 above                                                                                           |
| `GameState` shape or storage keys               | §5 + bump `GAME_STATE_VERSION` + zod schema                                                        |
| Layer boundaries, new directory                 | §3 + `docs/architecture.md`                                                                        |
| Ruleset behaviour or values                     | `docs/india-edition-rules.md` **and** the in-app booklet — they must stay in sync; see below       |
| Scripts in `package.json`                       | §6                                                                                                 |
| Fixing/adding duplication or a known bug        | the §7 DRY table / §8 list — remove rows you resolve                                               |
| Deleting part of the legacy island              | §2                                                                                                 |
| Adding tests, or fixing a harness blocker       | the coverage table / blocker list in [docs/coding-guidelines.md](docs/coding-guidelines.md) §5     |
| Conventions, testing policy, definition of done | [docs/coding-guidelines.md](docs/coding-guidelines.md)                                             |
| An ESLint rule                                  | [docs/conventions.md](docs/conventions.md) §1 and the §8 enforcement table                         |
| **Adding or removing any file**                 | [docs/file-index.md](docs/file-index.md) — one line saying what it does                            |
| **Adding a feature**                            | a new [docs/features/](docs/features/) doc from `_template.md`, plus its row in the features index |
| Changing a feature's behaviour or decisions     | that feature's doc in `docs/features/`                                                             |
| Adding a theme, or changing theme tokens        | [docs/theming.md](docs/theming.md)                                                                 |

### The rules booklet and the ruleset doc are one thing in two places

`docs/india-edition-rules.md` and the in-app booklet (`src/components/rules/`) must never disagree.
Two mechanisms hold them together, and both are machine-enforced by
[rulesSync.test.ts](src/features/rules/rulesSync.test.ts):

- **Topics**: `RULES_SECTIONS` (`components/rules/rulesSections.constants.ts`) is the single list
  behind the page's nav, the sections it renders, and the matching heading in the markdown. Add a
  section to one and the test tells you to add it to the other.
- **Numbers**: the booklet renders every amount from a constant, so it updates itself. The markdown
  cannot, so the test asserts each constant's formatted value still appears in it. Change
  `STARTING_CASH` and the test fails naming the constant.

Prose is not diffable, so it is on you: change a rule in one and change it in the other.

Before finishing a task: re-read the sections you touched, delete anything now false, and re-run `npx tsc --noEmit` + `pnpm test`.
