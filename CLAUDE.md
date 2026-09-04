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

## 2. One code tree

`src/` is the app and nothing else. The Zelda-themed legacy island that used to sit beside it —
`src/redux/`, `src/utility/`, `src/components/monopoly/`, `src/components/home/`,
`src/components/not_found/`, and the `.scss`/`.json` under `src/assets/` that only it used — was
deleted once the ruleset was complete. It had zero import edges into the active tree and shipped
nothing.

`jquery`, `redux`, `redux-thunk` and `redux-mock-store` went with it; state is RTK slices over the
pure engine. Anything in an older doc describing Zelda spaces, `boardData.json`,
`playerAppropriateActionUtils` or `Monopoly.tsx` is **historical** — it is in git history, not on
disk.

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
       rules/gameEngine.ts       createGameState + the command dispatch table
       rules/engine/             the engine by concern: state, money, rent,
                                 movement, cards, turn, auction, trade settlement
       rules/engine/commands/    one handler per command, grouped by area
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

All twenty-four runtime commands are implemented: `rollTurnDice`, `buyLandedAsset`,
`declineLandedAsset`, `submitAuctionBid`, `passAuction`, `payJailFine`, `useJailFreeCard`,
`attemptJailRoll`, `acknowledgeCard`, `mortgageAsset`, `unmortgageAsset`, `settleDebt`,
`confirmBankruptcy`, `buildHouse`, `buildHotel`, `sellHouse`, `sellHotel`, `proposeTrade`,
`acceptTrade`, `rejectTrade`, `chooseBusMove`, `chooseSpeedDieDestination`, `chooseBuildingSite`, `endTurn`.

`GameCommandResult.uiHints` is consequently always empty - it only ever carried "not implemented
yet" notices, and nothing renders it now. Feedback goes through the history and the toasts.

**The engine is nine modules and nine command groups, and the layering is one-way.**
`engine/state.utils.ts` depends on nothing else and everything is built from it; commands sit on
top and nothing imports them but the dispatch table in `gameEngine.ts`. `applyCardEffect` lives with
its command rather than beside `drawCard` because applying an effect resolves a space, and keeping
that out of `cards.utils.ts` is what stops the two forming a cycle. **`gameEngine.ts` no longer has
an eslint exemption** — it had one for `max-lines`, `max-lines-per-function` and `complexity`, and
the split is what removed the need for it. Do not add another.

### Locked economics (`gameEngine.ts` constants)

Starting cash `₹1500` · pass GO `₹200` · jail fine `₹50` · auction opens at `₹10`, min increment `1` · 40 spaces · 32 houses / 12 hotels (now really decremented) · buildings refund `floor(cost/2)` · history capped at 120 events, newest first.

**The Speed Die is optional and fixed at setup.** `useSpeedDie` on `GameState`, and it stays inert
until every non-bankrupt player has `hasPassedGo`. Only the two white dice decide doubles and Jail;
`turn.speedDieFace` is deliberately separate from `turn.lastRoll` so no reader has to remember to
exclude it. A three-of-a-kind is **not** a double - no extra roll, no step towards Jail.

**Mr. Monopoly's advance survives a decision.** It is `turn.pendingMonopolyAdvance`, applied by
`resumeTurnAfterDecision` once the turn is clear - the landed space may raise a decision of its own.
Any command that answers a decision must go through `resumeTurnAfterDecision` rather than restating
its phase rules, or the advance is silently dropped.

**Both even rules are one comparison.** No two sites in a colour group may differ by more than one
`buildLevel` (0-4 houses, 5 a hotel). `buildBlockedReason` / `sellBlockedReason` in
[buildings.utils.ts](src/domain/rules/buildings.utils.ts) state it once, and both the engine's throw
and the site panel's disabled button read from there - never restate the rule in a component.

Money moves through exactly three choke points, and all of them log an event: `resolveBankPayment`
(out), `creditFromBank` (in) and `resolvePlayerPayment` (between players). Buying and auctions used
to move cash inline and log their own line; they go through the primitives now, so the invariant is
total. Add a fourth and feedback silently stops working for it.

**An auction records its own bidding.** `AuctionState.ledger` is every bid and pass, oldest first,
opening line included - it cannot be derived from the standing high bid and `passedPlayerIds`, and
the game history is prose without a player id. The panel reads it; the _win_ is not in it, because
the auction is discarded the moment it settles and the win is logged by `resolveBankPayment` like
any other payment. **What makes a bid legal is stated once**, in `bidBlockedReason`
([auctionBids.utils.ts](src/domain/rules/auctionBids.utils.ts)): the engine throws from it and the
panel disables Submit from it. See [docs/features/auctions.md](docs/features/auctions.md).

**A utility's rent is charged on the dice that brought the player there.** `resolveCurrentSpace`
takes the total: the turn's own roll when they rolled their way in, a fresh throw when a card or a
Mr. Monopoly advance put them there.

**`doublesCount`, not `canRollAgain`, is what survives a blocking decision** — `resolveCurrentSpace`
sets `canRollAgain: false` while one is pending. Restore the phase with `resumeTurnAfterDecision`;
anything reading `canRollAgain` back after a decision silently eats the player's extra roll.

Money values live in `domain/board/` and `gameEngine.ts` constants — never hardcode an amount in a component.

---

## 5. Persistence

- Keys: index `monopoly.games.index.v1`, per game `monopoly.game.<id>.v1`.
- `GAME_STATE_VERSION = 8`. **Bump it and add a migration whenever `GameState` changes shape**, or saved games break on load. Migrations live in [features/persistence/migrations.ts](src/features/persistence/migrations.ts), keyed by the version they upgrade _from_, and run **before** zod validation - the schema describes the current shape, so an older save has to be made current first or it fails to parse and the game is lost.
- Loads are validated with zod (`features/persistence/schema.ts`), and it is **tight**: players, the board as a discriminated union of space kinds, ownership, both decks, and the trade and auction states are all described. Three cross-field checks too — 40 spaces, `activePlayerIndex` in range, `playerOrder` naming players that exist. Change a shape and this changes with it. `pendingDecision` is the one deliberate exception (see below).
- **A render that throws is caught** by `ErrorBoundary` (`shared/components/`), the only class component here. The schema should catch a corrupt save first; this is for a save that satisfies it and still breaks a component.
- **A new top-level `GameState` field is silently stripped on load**: `gameStateSchema` is a plain `z.object`, which drops unknown keys. `pendingDecision` is `.passthrough()`, so a decision's own payload survives — which is why the drawn Chance / Community Chest card rides inside the decision rather than in a field of its own. Add the field to the schema, or put it where it will survive.
- Every command save is a full-state write, then the index is rewritten sorted by `updatedAt`.

---

## 6. Commands

**pnpm, never npm.** The lockfile is `pnpm-lock.yaml`, `packageManager` pins the version, and a
`preinstall` script refuses any installer that is not pnpm - so `npm install` stops rather than
quietly writing a second lockfile. Reach for a script below rather than `npx`.

```bash
pnpm dev          # Vite dev server on :3000
pnpm build        # production build → build/
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (src/**/*.test.{ts,tsx})
pnpm test:e2e     # playwright (tests/e2e), auto-starts dev server
pnpm lint         # eslint (config: .eslintrc.json)
pnpm check-all    # typecheck + lint + prettier, in one
pnpm fix-all      # eslint --fix + prettier write
pnpm deploy       # gh-pages → build/
```

**Baseline as of the last verified run: `pnpm check-all` clean, 1058 unit tests and 122 e2e passing,
`pnpm build` succeeds.** Keep it that way — re-run all of them before reporting a change done.

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs exactly that on every push and PR, so the
baseline is enforced rather than remembered. Two things there are load-bearing: `CI` flips
`server.open` off in `vite.config.mjs` (there is no browser to open on a runner), and it flips
`reuseExistingServer` off in `playwright.config.ts` — adopting a stray dev server would mean testing
code the job never built. `pnpm/action-setup` is deliberately given no `version:`, so `packageManager`
stays the one place pnpm is pinned.

---

## 7. Conventions

**Modularity**

- `domain/` stays pure. UI-only concerns (colors, icons, copy) never leak into it.
- `components/game/` are presentational: props in, callbacks out, no `useAppSelector`.
- Slices hold state; _thunks_ hold orchestration. Business rules belong in the engine.
- **Enums live in `*.enums.ts`; exported interfaces and type aliases in `\*.interfaces.ts.** Machine-enforced by `no-restricted-syntax`. Component `Props`, hook `Use*Result`/`Use*Options`, and type aliases derived from a value in the same file are exempt — see [docs/conventions.md](docs/conventions.md) §1, which also explains why the rule must stay in a single `overrides` entry.
- **Relative imports, everywhere.** The `@app/*`-style path aliases are gone: `nxViteTsPaths()` made them work, but nothing used them across 570 relative imports, and a working-but-unused second style is exactly the drift to avoid. Re-adding them is a `paths` block in `tsconfig.json` if that call is ever revisited.

**DRY — known duplication, fix on contact**
| Duplicated | Locations |
|---|---|
| `availableThemes.find(...)` theme lookup | [engine/state.utils.ts:54](src/domain/rules/engine/state.utils.ts:54) (has the fallback, as `getThemeOrDefault`), [hooks/useActiveGame.ts:33](src/features/game/hooks/useActiveGame.ts:33), [hooks/useGameSetupForm.ts:68](src/features/setup/hooks/useGameSetupForm.ts:68). The other two should call `getThemeOrDefault` |
| Two fallbacks for one value: `DEFAULT_CURRENCY_SYMBOL` (`game.constants.ts`) and `getThemeOrDefault(...).currencySymbol` (`gameEngine.ts`) | both resolve the currency symbol independently |

_Resolved:_ the duplicated street colour-group hex maps are gone — colours are now theme tokens with generated `.group-*` classes (see [docs/theming.md](docs/theming.md)). So is the inline hex-to-rgb in the e2e suite: it is `tokenColor` in `tests/e2e/helpers.ts`, and assertions compare against a theme token rather than a literal `rgb(...)`.

When you touch one of these, extract it (colors/icons → a shared board-presentation module; `formatMoney` + `isPropertySpace` → shared helpers) rather than adding a sixth copy.

**Styling** — SCSS under `src/styles/`, entry `main.scss`, imported once in `App.tsx`. Layered: `abstracts` (tokens, mixins) → `themes` → `base` → `layout` → `components` → `pages`.

- **Never hardcode a colour, and the board now proves it.** Every colour is a CSS custom property emitted by the theme engine; use `var(--accent)`, `var(--surface-panel)`, etc. A raw hex in a component partial breaks theming. `board.spec.ts` flips `data-theme` to `midnight` mid-run and fails on any board colour that does not move — the board's paper, grain and vignette are all tokens plus repeating gradients, with **no raster assets to ship or theme**. The theme guard also `@error`s on a token a theme defines that nothing reads. The one sanctioned exception is a **player token colour**, applied inline from `ThemeToken.color` — it is theme _data_, not a CSS token. See `BoardTokenLayer`, `PlayerCard`, and the board's owner dot.
- Themes are token maps in `themes/_themes.scss`, emitted as `[data-theme="<id>"]` blocks. A compile-time guard fails the build if a theme misses a contract token. See [docs/theming.md](docs/theming.md).

**Testing — mandatory, all three levels.** Every feature, entity, and behaviour ships with **unit + integration + e2e** coverage in the same change. Unit: pure logic, `SeededRandomSource` for dice, cover every `throw` branch. Integration: thunk → engine → persistence → store, and pages via `src/test/renderWithProviders.tsx`. E2E: the user journey in Playwright, queried by accessible role and name.

Full definition of done, per-layer patterns, and the current coverage gap: [docs/coding-guidelines.md](docs/coding-guidelines.md). The three harness blockers are cleared — `pnpm lint` works, `makeStore()` gives a fresh store per test, and `localStorage` is reset between them. The integration layer is covered too: `gameSlice`'s thunks have 24 tests asserting on the store _and_ on `localStorage`, and `uiSlice`, `GamePage` and `SeededRandomSource` have their own.

---

## 8. Known gaps and traps

- **Every event carries a `GameEventCue` saying what happened**, set where it happened - not read back out of the message. It drives two things: the toast's colour and the sound. It was three tones for the colour alone and was regex-matched from the wording before that, so rephrasing a sentence silently changed it. A new cue needs a row in `SOUND_FOR_CUE`; `soundCues.guard.test.ts` fails until it has one.
- **Never offer an action the engine will reject, and make sure a rejection is visible anyway.** Every affordability rule is a `*BlockedReason` in `domain/rules/` that the engine throws from _and_ the control disables from - `bidBlockedReason`, `buildBlockedReason`, `sellBlockedReason`, `siteActionBlockedReason`, `buyBlockedReason` - so a live button is always a command that will succeed, and the reason is shown in the panel rather than only as a `title`. Buying was the one left unguarded: Buy stayed live regardless of cash, and clicking it left a modal that could not be answered with only a console line to show for it. The `CommandErrorBanner` is the net beneath that, and it has to paint **above** the decision backdrop - it renders in the sidebar, and the backdrop is a fixed sheet over the whole viewport, so every rejection during a modal used to be invisible. It is inert to clicks while a modal is up, exactly as the toasts are.

- **A command's feedback waits for the move it is about.** The engine resolves a whole turn in one synchronous step, and the board then spends up to a couple of seconds walking the token there - so a toast dispatched from the thunk announced the rent before the player reached the site. `runGameCommand` queues into `ui.pendingFeedback` and has no say in the timing; `useFeedbackGate` drains it once `isMoving` clears, which is the same flag that already withholds the decision modal. Toasts and the cue release **together**, or the sound arrives early on its own. `data-moving` on `.game-layout` publishes the walk so a test can assert the invariant mid-flight. Anything new that speaks to the player goes through the queue, not straight to the store.

- **A mute must mute everything.** `soundEnabled` reaches the cue sounds, both dice rollers and the token walk. A switch that leaves two sounds playing is worse than none, and the e2e test fails on a half-mute.
- **A migration writes the shape of its own version, not today's.** `v4ToV5` still writes a `tone` as plain strings, and `v7ToV8` converts it - pointing v5 at the current enum made v8 overwrite its own input with nothing.
- **`GameCommandResult.events` is what this command appended**, and `saveRequired` is derived from whether the state changed. Both used to lie — `events` returned the whole capped history — so the toast feed diffed `history` itself. It no longer needs to.
- **`asset-liquidation` is resolvable, and queues.** `settleDebt` clears it; selling buildings and mortgaging are how the cash is raised, and both deliberately leave `pendingDecision` alone. Several debts from one card all stand: the extras ride in the decision's own `queued` array, which survives a save because `pendingDecision` is the one part validated with `.passthrough()`. Read it as `queued ?? []` — a game saved before the queue existed comes back without it.
- **A mortgaged property still counts toward colour-set completeness and the railway/utility counts** — deliberate, and matches the printed rule.
- **`movePlayerTo` takes a required `MoveDirection`**, and records it as `player.lastMove`. It has no default on purpose: two readers need it and neither can recover it. The GO salary is only paid going forward — the wrap test (`next < current`) is true of every backward move too — and the walking animation reads `lastMove` to know which way round the board to step. It used to infer direction from the position change, which cannot tell "back three spaces" from thirty-seven forward, and capped the walk at a dice roll so every longer move snapped.
- **`sendPlayerToJail` goes through `movePlayerTo`, backward.** Backward is the truth of it: no salary is paid for the trip, so walking the token forward would show a journey that did not happen — and from a Chance space just past GO, Jail is a few spaces _ahead_, so it looked like an ordinary roll. Setting `position` directly is what left it with no direction to report.
- **A walk reads its position off the clock, and a watchdog force-settles it.** Two failure modes rule out the obvious approaches: queueing every step up front means they all come due together after a stall (six steps in one millisecond, six taks as one noise), and chaining each step off the previous one hangs instead, because a background tab throttles timers to about one a second - a 39-step walk became a 39-second freeze with Roll disabled throughout. Elapsed time survives both. On top of that, `isMoving` gates the Roll button _and_ withholds every decision modal, so a token stuck mid-walk is an unplayable game with nothing on screen explaining why - `TOKEN_WALK_WATCHDOG_SLACK_MS` is the backstop that snaps every token to its true position and lets go. Two tests assert the guarantee holds even with the walk deliberately broken.
- **The step clip must stay shorter than `TOKEN_MIN_STEP_INTERVAL_MS`** and audible from its first millisecond, which `tokenStepSound.test.ts` measures. The clip it replaced was 1373ms with its first sound 177ms in, so at the fastest pace it never sounded at all. Rebuild it with [tools/trim-token-step.py](tools/trim-token-step.py).
- **Every move is walked, and the Roll button is gated on `isMoving`.** A double puts the turn straight into `AwaitExtraRollOrEnd`, so Roll went live mid-walk and the second roll restarted the walk from wherever the token had got to.
- **`tsconfig.json` is `strict: true`, target `es2020`**, and typechecks every file under `src/` — there is no `exclude`.

---

## Documentation contract

Docs here are load-bearing: `CLAUDE.md` is read into context every session, so a stale line actively misleads. **Update docs in the same change as the code**, not afterwards.

| If you change…                                  | Update                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Engine commands, phases, or constants           | §4 above                                                                                                   |
| `GameState` shape or storage keys               | §5 + bump `GAME_STATE_VERSION` + zod schema                                                                |
| Layer boundaries, new directory                 | §3 + `docs/architecture.md`                                                                                |
| Ruleset behaviour or values                     | `docs/india-edition-rules.md` **and** the in-app booklet — they must stay in sync; see below               |
| **Adding or changing a rule**                   | give the row an id, and name a test for it in `RULE_COVERAGE` — `rulesCoverage.test.ts` fails until you do |
| Scripts in `package.json`                       | §6                                                                                                         |
| Fixing/adding duplication or a known bug        | the §7 DRY table / §8 list — remove rows you resolve                                                       |
| Adding tests, or fixing a harness blocker       | the coverage table / blocker list in [docs/coding-guidelines.md](docs/coding-guidelines.md) §5             |
| Conventions, testing policy, definition of done | [docs/coding-guidelines.md](docs/coding-guidelines.md)                                                     |
| An ESLint rule                                  | [docs/conventions.md](docs/conventions.md) §1 and the §8 enforcement table                                 |
| **Adding or removing any file**                 | [docs/file-index.md](docs/file-index.md) — one line saying what it does                                    |
| **Adding a feature**                            | a new [docs/features/](docs/features/) doc from `_template.md`, plus its row in the features index         |
| Changing a feature's behaviour or decisions     | that feature's doc in `docs/features/`                                                                     |
| Adding a theme, or changing theme tokens        | [docs/theming.md](docs/theming.md)                                                                         |

### Every documented rule has a test

`docs/india-edition-rules.md` is the ruleset's source of truth, and every rule row in it carries a
stable id (`5.9`, `7a.4`, `Q1.2`). [ruleCoverage.constants.ts](src/features/rules/ruleCoverage.constants.ts)
maps each id to the test titles that prove it, and
[rulesCoverage.test.ts](src/features/rules/rulesCoverage.test.ts) fails three ways: a documented rule
with no entry, an entry naming a test that no longer exists, and an entry for an id the doc dropped.

So a rule cannot be documented without being tested, and a test cannot be renamed out from under a
rule. 153 rules, all claimed.

The board is checked the same way but harder: [board.rules.test.ts](src/domain/board/board.rules.test.ts)
**reads section 13 of the doc as its fixture** and compares all 40 spaces against
`indiaEditionBoard`, so the two cannot drift at all.

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

Before finishing a task: re-read the sections you touched, delete anything now false, and re-run `pnpm typecheck` + `pnpm test`.
