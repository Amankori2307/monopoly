# CLAUDE.md

Guidance for Claude Code working in this repository.

> **Every change ships with unit + integration + e2e tests, and updates its docs.**
> Binding rules: [docs/coding-guidelines.md](docs/coding-guidelines.md) — read before writing code.
> **Lost? Start with [docs/file-index.md](docs/file-index.md)** — one line per file, what each one does.
>
> [Conventions](docs/conventions.md) · [Architecture](docs/architecture.md) · [Features](docs/features/README.md) · [Theming](docs/theming.md) · [Ruleset](docs/india-edition-rules.md) · [Documentation contract](#documentation-contract)

---

## 1. What this project is

A **Monopoly** board game in the browser, playable as any of four editions (India, London, US, World): React 19 + TypeScript + Redux Toolkit, built with NX + Vite, saved to `localStorage`. Games have stable ids and are resumable via `#/game/:gameId`.

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
       setup/ChooserPage.tsx     the front door: how are you playing
       setup/NewGamePage.tsx     create game, list/resume/delete saves
       shell/AppShell.tsx        the themed shell + the header, for every page
       multiplayer/HostPage.tsx  open an online table
       multiplayer/JoinPage.tsx  join one with a six-character code
       game/GamePage.tsx         board render + decision panels
       game/gameSlice.ts         thunks: bridge UI ⇄ engine ⇄ storage
       game/uiSlice.ts           ephemeral UI state (auction bid input)
       rules/RulesPage.tsx       static rules booklet
       styleguide/               #/style: the design system, rendered
       persistence/              localStorage + zod validation
  └─ components/layout/          the app header and its settings menu
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

### The network is beside that path, never inside it

**The engine is never awaited, and local persistence stays synchronous.** Online play is a
replication layer that hangs off the end of the flow above, so a slow or broken connection can never
delay or fail a move that has already been made.

```
… → setActiveGame(nextState) → React re-renders
                             → session.publish(...)         fire-and-forget, last
                                  ├─ accepted → nothing more to do
                                  └─ conflict → adoptRemoteGame(theirs)   remote always wins

somebody else moved  → doorbell (revision only) → session.fetch()
                     → decodeGameState(...) → adoptRemoteGame(...)
```

Three rules hold it together, and each has a test that fails without it:

- **The command is never replayed on a conflict.** Re-applying it onto a new base is how a bid of
  ₹200 lands on top of a ₹250 that was already accepted.
- **`adoptRemoteGame` re-saves `localStorage`.** `trySave` has already written the optimistic state,
  so skipping this leaves a rejected move on disk and a refresh restores a phantom.
- **A publish failure is not a command error.** The move happened; a connection problem must not
  look like a refusal.

A hot-seat game uses `LocalSession`, which accepts every publish and does nothing — so there is one
command path rather than an `if (isOnline)` that can rot on one side. The session reaches thunks as
`thunk.extraArgument`: Redux state would trip `serializableCheck` (a session holds a socket), and
middleware is the wrong seam because every mutation is dispatched as a thunk.

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

- Keys: index `monopoly.games.index.v1`, per game `monopoly.game.<id>.v1`, this device's seat
  `monopoly.seat.<id>.v1` and its join code `monopoly.code.<id>.v1`, plus the preferences
  `monopoly.sound.v1` and `monopoly.appearance.v1`. **The index is its own shape with its own
  schema and no version**, so adding a field to it is not a `GAME_STATE_VERSION` change - see §8.
- `GAME_STATE_VERSION = 10`. **Bump it and add a migration whenever `GameState` changes shape**, or saved games break on load. Migrations live in [features/persistence/migrations.ts](src/features/persistence/migrations.ts), keyed by the version they upgrade _from_, and run **before** zod validation - the schema describes the current shape, so an older save has to be made current first or it fails to parse and the game is lost.
- Loads are validated with zod (`features/persistence/schema.ts`), and it is **tight**: players, the board as a discriminated union of space kinds, ownership, both decks, and the trade and auction states are all described. Three cross-field checks too — 40 spaces, `activePlayerIndex` in range, `playerOrder` naming players that exist. Change a shape and this changes with it. `pendingDecision` is the one deliberate exception (see below).
- **A render that throws is caught** by `ErrorBoundary` (`shared/components/`), the only class component here. The schema should catch a corrupt save first; this is for a save that satisfies it and still breaks a component.
- **A new top-level `GameState` field is silently stripped on load**: `gameStateSchema` is a plain `z.object`, which drops unknown keys. Add the field to the schema, or it will not survive a save.
- **`pendingDecision` is a full discriminated union, and is no longer `.passthrough()`.** It was, so a decision could carry a payload the schema did not describe — fine on disk, where the only writer was this app, and exactly the wrong thing over a network: it was the one hole through which a peer could hang arbitrary keys off a decision before it reached the engine. Every payload now has a line, including the drawn card and a liquidation's `queued` debts (optional, because a save written before the queue existed comes back without it). Adding a field to a decision means adding it here too.
- **One decoder, for disk and for the network.** [decodeGameState](src/features/persistence/decodeGameState.ts) migrates then validates, and both `loadGame` and any state arriving from another device go through it. Two decoders would drift the first time a shape changed, and only one of them would be the one an attacker sends to.
- Every command save is a full-state write, then the index is rewritten sorted by `updatedAt`.

---

## 6. Commands

**pnpm, never npm.** The lockfile is `pnpm-lock.yaml`, `packageManager` pins the version, and a
`preinstall` script refuses any installer that is not pnpm - so `npm install` stops rather than
quietly writing a second lockfile. Reach for a script below rather than `npx`.

```bash
pnpm dev          # Vite dev server on :3000 - the only one, and online-capable
pnpm tunnel       # ngrok over :3000, for a device that is not on this network
                  #   needs: ALLOW_TUNNEL_HOSTS=1 pnpm dev -- --host 0.0.0.0
pnpm build        # production build → build/
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (src/**/*.test.{ts,tsx})
pnpm test:e2e     # playwright (tests/e2e), auto-starts dev server
pnpm test:routing # builds, then playwright (tests/routing) against a static host on :3300
pnpm test:online  # builds, then playwright (tests/online) against the REAL project
pnpm lint         # eslint (config: .eslintrc.json)
pnpm check-all    # typecheck + lint + prettier, in one
pnpm fix-all      # eslint --fix + prettier write
pnpm deploy       # gh-pages → build/
```

**Baseline as of the last verified run: `pnpm check-all` clean, 1481 unit tests, 213 e2e and 5 routing tests passing,
`pnpm build` succeeds.** Keep it that way — re-run all of them before reporting a change done.

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs exactly that on every push and PR, so the
baseline is enforced rather than remembered. A push to `master` that passes both jobs then
**deploys** to https://amankori2307.github.io/monopoly/ - the built tree is force-pushed to the
`gh-pages` branch, which is where Pages serves this repo from (`build_type: legacy`, source
`gh-pages` at root), so no repository setting is involved. The deploy has its own concurrency group
with `cancel-in-progress: false`, because the top-level group cancels on a new push and a deploy
interrupted mid-push is how a half-written tree ends up being served. `pnpm deploy` still exists for
publishing by hand. Two things there are load-bearing: `CI` flips
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
- **An appearance is not an edition.** An edition (`src/domain/themes/`) names the forty squares, the currency and the pieces; an **appearance** is only a palette, and it overrides `data-theme` for whichever edition is being played. It is a per-device preference stored under `monopoly.appearance.v1` - the same standing as the sound switch - so adding one needs **no `GAME_STATE_VERSION` bump and no migration**. `edition` is a sentinel, not a palette: it resolves to the edition's own id. One hook answers all of it, [useAppearance](src/features/appearance/useAppearance.ts) - three pages ask, and answering it in each is how two of them disagree.
- **Every breakpoint goes through a mixin, and one of them is a height query.** `below()` for widths; `landscape-compact()` for a wide-but-short viewport, which needs all three of `max-width`, `max-height` and `orientation` — width alone cannot tell a landscape phone from a small desktop window, and it is the height that breaks the board. Tokens: `$breakpoint-board` (1250) / `-tablet` (720) / `-mobile` (620) / `-phone` (560), plus `$breakpoint-short`. Never write a bare `@media` width query.
- **Anything drawn on the board is sized in `cqw`, not `vw`.** `.board-card` is a `container-type: inline-size` container and publishes `--token-size`. `vw` tracks the viewport, which stops agreeing with the board as soon as the board is capped by `dvh` — and in landscape the board is sized by _height_, so `vw` tracks nothing it is drawn on. Desktop keeps the original `vw` clamps deliberately: `board.spec.ts`'s 21 geometry tests are calibrated against them.
- **Use `dvh`, never `vh`.** `vh` includes mobile browser chrome that is not there, so a `100vh` shell is always taller than the window.

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
- **The engine derives its actor from the state, never from the caller — and `getActivePlayer` is
  the wrong source for three of them.** [actor.utils.ts](src/domain/rules/actor.utils.ts) states it
  once: `decisionOwnerOf` (who must answer the pending decision - the trade's _recipient_, the
  auction's _current bidder_, the liquidation's _debtor_), `getExpectedActorId` (that, or whoever's
  turn it is), and `getAssetHolderId` (whose holdings a cash-raising command acts on: the debtor
  during a liquidation, the active player otherwise). A `collect-from-each` card bills every player,
  so the one who cannot pay is often not the active player - and `mortgageAsset` / `sellHouse` /
  `sellHotel` read `getActivePlayer`, so that debtor was told they did not own their own site and
  bankruptcy was their only exit. `decisionOwnerOf` is exhaustive over the twelve decision types on
  purpose: a new one is a type error rather than a silent default to the active player.
- **A mortgaged property still counts toward colour-set completeness and the railway/utility counts** — deliberate, and matches the printed rule.
- **`movePlayerTo` takes a required `MoveDirection`**, and records it as `player.lastMove`. It has no default on purpose: two readers need it and neither can recover it. The GO salary is only paid going forward — the wrap test (`next < current`) is true of every backward move too — and the walking animation reads `lastMove` to know which way round the board to step. It used to infer direction from the position change, which cannot tell "back three spaces" from thirty-seven forward, and capped the walk at a dice roll so every longer move snapped.
- **`sendPlayerToJail` goes through `movePlayerTo`, backward.** Backward is the truth of it: no salary is paid for the trip, so walking the token forward would show a journey that did not happen — and from a Chance space just past GO, Jail is a few spaces _ahead_, so it looked like an ordinary roll. Setting `position` directly is what left it with no direction to report.
- **A walk reads its position off the clock, and a watchdog force-settles it.** Two failure modes rule out the obvious approaches: queueing every step up front means they all come due together after a stall (six steps in one millisecond, six taks as one noise), and chaining each step off the previous one hangs instead, because a background tab throttles timers to about one a second - a 39-step walk became a 39-second freeze with Roll disabled throughout. Elapsed time survives both. On top of that, `isMoving` gates the Roll button _and_ withholds every decision modal, so a token stuck mid-walk is an unplayable game with nothing on screen explaining why - `TOKEN_WALK_WATCHDOG_SLACK_MS` is the backstop that snaps every token to its true position and lets go. Two tests assert the guarantee holds even with the walk deliberately broken.
- **The step clip must stay shorter than `TOKEN_MIN_STEP_INTERVAL_MS`** and audible from its first millisecond, which `tokenStepSound.test.ts` measures. The clip it replaced was 1373ms with its first sound 177ms in, so at the fastest pace it never sounded at all. Rebuild it with [tools/trim-token-step.py](tools/trim-token-step.py).
- **Every move is walked, and the Roll button is gated on `isMoving`.** A double puts the turn straight into `AwaitExtraRollOrEnd`, so Roll went live mid-walk and the second roll restarted the walk from wherever the token had got to.
- **The dice tumble _after_ the commit, not before it.** The click used to animate for 520ms and only then tell the engine. In one browser that reads fine, because the only person who can click is the person watching; with a seat per device it is wrong twice - everyone else sees the faces snap to a result with no throw, and the roller is watching an animation of a roll that has not happened yet, so a refusal lands after the dice have "settled". The tumble is keyed on **`turn.lastRollId`**, so every device replays one authoritative throw exactly once. Do **not** derive that from `history[0].id`: it changes on every command rather than every roll. `isRolling` (the animation, true everywhere) and `isSubmitting` (this device's own in-flight lock, with a watchdog) are deliberately separate. The board holds the token walk for the tumble's length via `useIsRollingDice`, and **the hold does not bypass the walk watchdog** - one is armed while holding too, or a hold that never cleared would leave `isMoving` true forever and the game unplayable.
- **A hook that sets state must not depend on an array prop's identity.** `useDiceRoller` settled on `lastRoll` and depended on the array, so any caller building it inline re-rendered forever. It keys on the faces now.
- **Routing is `HashRouter`, and the `#` is not spare.** GitHub Pages is a plain static host under
  the `/monopoly/` base: it serves a file or it 404s, so `BrowserRouter` made every deep link and
  every mid-game refresh a hard 404 - and the home page too, because `/monopoly/` never matched `/`.
  The consequence to remember is that **a bare `<a href="#section">` is now a route**, not an anchor:
  it navigates to `/section`, matches nothing, and blanks the page. Link to `/route#section` and let
  [useHashScroll](src/features/rules/hooks/useHashScroll.ts) do the scrolling. E2E URLs carry the
  hash (`page.goto('/#/rules')`), and `page.goto` to a URL that differs **only** in its hash does not
  reload the document - use `page.reload()` when a test needs the app to re-read `localStorage`.
  None of this is reproducible against the dev server, which falls back to index.html for unknown
  paths; that is what `pnpm test:routing` and [tools/serve-build.mjs](tools/serve-build.mjs) exist
  for, and the suite's first test asserts the host really does 404 so the rest is not vacuous.
- **The deployed origin is `https://amankori2307.github.io/monopoly/`.** `index.html`, `sitemap.xml`
  and `robots.txt` used to advertise `monopoly.amankori.me`, which does not resolve - no `CNAME`
  exists and none should be added without DNS first, because setting a custom domain with no DNS
  behind it takes the working github.io URL down too.
- **Configuration is read through `import.meta.env`, and absent configuration is not an error.**
  The old CRA `REACT_APP_*` shim in `vite.config.mjs` is gone - nothing had read `process.env` in
  years. [onlineConfig.utils.ts](src/features/multiplayer/onlineConfig.utils.ts) resolves the two
  Supabase variables **once** and returns `null` when either is missing or the url is not a real
  remote origin, so a build without them is exactly the offline hot-seat game rather than one that
  fails at the network. Two traps: `src/types/env.d.ts` is hand-written because
  `/// <reference types="vite/client" />` re-declares the `*.svg`/`*.png`/`*.wav`/`*.json` modules
  that `src/types/assets.d.ts` already owns; and **a plain `.env` is loaded in every Vite mode,
  `test` included** - one sitting in the repo would silently hand all the unit tests a
  network-enabled config, so it is gitignored and `onlineConfig.test.ts` asserts this build is
  offline under test. The anon key is public by design (it ships in the bundle) and RLS is the real
  access control; a `service_role` key belongs in no .env, no bundle and no CI secret.
- **The realtime doorbell is a broadcast, and it cannot be `postgres_changes`.** Realtime evaluates
  RLS before forwarding a row change, and `games` deliberately has RLS on with **no policies** - so a
  `postgres_changes` channel subscribes happily and then delivers nothing at all. Verified against
  the live project. Making it work would need `grant select` plus a permissive policy, which is the
  exact hole the RPC design closes. Broadcast touches no table; the bell carries only a revision, and
  the state still comes from `fetch_game`, which needs the join code - so a spoofed bell costs one
  redundant fetch. A 30s poll is the backstop, because a socket that is up but silently not
  delivering is the failure these transports really have. See
  [docs/features/multiplayer.md](docs/features/multiplayer.md).
- **Who may act is one union and one predicate.** `Viewer` is `HotSeat | Seated | Spectator` and
  `viewerControls(viewer, playerId)` is the only place the question is answered
  ([viewer.utils.ts](src/features/multiplayer/viewer.utils.ts)). Hot-seat is a **member of the
  union**, not `viewer.playerId === activePlayer.id` - that shortcut breaks in exactly the two places
  it matters, because the auction's current bidder rotates independently of the turn and a trade's
  recipient is never the active player. `resolveViewer` fails closed to Spectator, never to the
  active player. `tableMode` lives on `GameState` because every device has to agree: per-device, one
  client could declare itself hot-seat and take the whole table. The seat _claim_ is per-device in
  `localStorage`, because "which of you am I" is the one genuinely local fact.
- **A command that ANSWERS a decision must clear it, on every exit.**
  `resolveCurrentSpace` picks the turn's phase from
  `pendingDecision.type !== None`, so a decision left standing after it has been
  answered puts the turn into `AwaitDecision` - and if nothing can render that
  decision any more, the game is dead with no modal, no Roll and no End turn.
  `attemptJailRoll` did exactly this on two of its three exits: the player left
  Jail, `jail-choice` stayed, and the Jail panel had already stopped rendering
  because it keys off `player.inJail`. **The existing tests could not see it**,
  because the square the player lands on usually raises a buy decision that
  overwrites the stale one - it only deadlocks when the landing asks for
  nothing, such as a station the player already owns. `selectHasAvailableAction`
  is the oracle for this and already logs it loudly; point new decision paths at
  it. `v9ToV10` repairs the saves that were caught.
- **The decision on screen is not always `pendingDecision`.** The Jail panel is derived from
  `player.inJail`, so it appears while `pendingDecision` is `None`. That is why the overlay asks
  `decisionActorId` (which falls back to the active player) rather than `decisionOwnerOf` (which
  correctly reports "no decision owner") - getting it the other way round showed a jailed player an
  inert copy of their own only move. Every decision type needs a row in `AUDIENCE_FOR_DECISION`;
  `decisionAudience.guard.test.ts` fails until it has one, the same tactic as `SOUND_FOR_CUE`.
  Game over is the one `Everyone` row - there is no owner and everybody needs the button.
- **A client never sends the whole seats list.** `claim_seat` used to take the array and store it,
  which made every claim a last-writer-wins overwrite of everybody - a guest that clicked before its
  first fetch came back sent an array containing only itself and **deleted the host**. Found with two
  real browsers. The merge is done in SQL under the row lock now (migration 0003), and the lobby also
  refuses to offer any control until `phase !== null`, because "not read yet" is not "empty".
- **There is one dev script, and the offline promise is enforced rather than assumed.** There were
  three (`start`, `dev`, `dev:online`); `start` was byte-identical to `dev` and `dev:online` existed
  only because `onlineConfig` resolves once at module load, so the _build_ decided whether online
  play was on offer. That made the kind of game a property of the build rather than a choice the
  player makes, and meant `pnpm dev` could not host a table at all. Now `.env.development` (which
  `test` mode never loads, so `onlineConfig.test.ts` keeps its meaning) gives the one dev server a
  config, and **the browser cannot resolve the backend host**: both Playwright configs blackhole it
  via `--host-resolver-rules`, and [offline.spec.ts](tests/e2e/offline.spec.ts) fails if that hole
  ever opens. That matters because the old guarantee was only "the config is absent" - one test
  (`lobby.spec.ts`'s "says a table is not there") already reached `fetch_game` and went green, and
  `pnpm test:routing` has always served a production build with a real config, escaping purely
  because no test there visits an online route. `allowedHosts` for a tunnel is now
  `ALLOW_TUNNEL_HOSTS=1`, so protection stays on by default.
- **Where you play is the player's choice, not the build's.** The chooser offers On this device /
  Host online / Join a game **always**. The two online tiles used to be hidden unless
  `isOnlineEnabled()`, which is why `pnpm dev` looked like it was missing a feature. A build
  genuinely without a backend now says so on the screen you land on, and `JoinPage` distinguishes
  "no game with that code" from "this copy cannot play online" - it used to report the former for
  both. The one gate that **stays** is in `useTableRejoin`: `attachOnlineSession` goes through
  `requireConfig()`, which throws, and a throw inside an effect reaches nothing but `ErrorBoundary`.
- **`pnpm test:online` writes real rows to the real project**, so it is not part of `test:e2e`, and
  it is the only suite whose browser is allowed to resolve the backend at all. It serves the
  production build.
- **Pause, do not fork.** A move made while the table is unreachable is a move nobody else will ever
  see, and each further one drifts this device deeper into a private game that cannot be reconciled.
  `runGameCommand` refuses outright when an online session's connection is not live
  ([connection.utils.ts](src/features/multiplayer/connection.utils.ts)) - a visible stall is worse to
  look at and far better to recover from than a silent split. A local game is never blocked. The
  banner and the refusal read the same sentence, like every other `*BlockedReason`, and there is
  **one** banner rather than two: a second would fight the first for the strip above the decision
  backdrop, the only place either is visible while a modal is up.
- **Presence is a broadcast, never a column.** A heartbeat that bumped `revision` would wake every
  device several times a minute to fetch a state that had not changed. It is keyed by **device**, not
  by seat, because a player who reconnects from their phone is a different device holding the same
  seat. An empty presence set means "no information" rather than "nobody is here" - reading it as
  absence would mark every player at a hot-seat table as away.
- **Replacing the live session must be announced, and an effect must not depend on state its own
  handler changes.** Two bugs from the same root, both found only by driving two real browsers. The
  session registry is a plain mutable holder, so swapping it re-renders nothing - an effect that
  subscribed on the first render stayed attached to the **local** session and never heard a bell, so
  the host sat watching an empty lobby while the guest was already seated. `sessionEpoch` in the seat
  slice is the signal; piggy-backing on `connection` looked equivalent and was not, because attaching
  often sets it to the value it already had. Then, keying the lobby's subscription on `connection`
  made the bell handler **cancel itself**: it calls `openOnlineTable`, which sets Connecting, which
  tore the effect down and marked its own in-flight promise cancelled - so the guest never followed
  the host into the game. Depend on `session`, whose identity changes only when it is genuinely
  replaced.
- **A lobby's state is not a game.** `OnlineSession.fetch` and the 30s poll both used to decode it,
  which logged "this game is damaged" every thirty seconds for a perfectly healthy table and, worse,
  threw before reporting the revision - so a lobby could never be refreshed by the poll at all. The
  poll reads the row rather than the game; the caller only ever needs the revision.
- **`crypto.randomUUID` is secure-context only, and the engine depends on it for every event id.**
  It is there on localhost and https and **undefined** on a plain-http address like
  `http://192.168.1.5:3000` - which is exactly how another computer reaches a tunnelled dev server. So the
  whole game broke there, online or not, on the first event created.
  [id.utils.ts](src/domain/rules/id.utils.ts) falls back to a real v4 built from `getRandomValues`,
  which carries no such restriction; the shape matters as much as the entropy, because a game id goes
  into a Postgres `uuid` column. `navigator.clipboard` is restricted the same way, which is why the
  invite link's Copy is already wrapped in a try/catch and the link stays selectable.
- **A tunnel needs `server.allowedHosts`.** Vite refuses a request whose `Host` header it does not
  recognise - that is its DNS-rebinding protection - so an ngrok URL answers "Blocked request. This
  host is not allowed." It is opt-in through `ALLOW_TUNNEL_HOSTS=1` rather than a second dev script,
  so the server the e2e suite starts keeps the protection.
- **Never trust a slow e2e run without checking what else is on the machine.** A suite that runs in
  1.3 minutes took twenty, with different tests failing each time and no code cause: four stray Vite
  servers and orphaned nx daemons from earlier sessions were competing for the CPU. `pgrep -fl vite`
  and `lsof -ti:3000` first, before reading anything into the failures - and measure load _during_ a
  run, not after, and not on the Playwright process, which only orchestrates while Chromium works.
- **The font stylesheet is loaded non-blocking**, and that is not a micro-optimisation. A
  render-blocking third-party stylesheet means a blank page for however long Google takes to answer,
  which on a stalling connection is thirty seconds. The e2e browser also resolves both font hosts to
  nothing (`--host-resolver-rules` in `playwright.config.ts`): a test should not be able to pass or
  fail on somebody else's CDN.
- **The tap floor is for everything you press, not just for `<button>`.**
  `$control-tap` is 44px and the button base states it once, so every button
  variant was already right - and a measurement pass over a 360x640 Android
  frame found five controls under it, all of them something else: the header's
  nav links at 30px, the wordmark at 12, the booklet's ten section chips at 21,
  the deed sheet's close cross at 30x30, and a native checkbox at 13x13. A
  checkbox stays 20px on purpose and the **`<label>` around it** is the target,
  which is why `.checkbox-field` is a label and `mobile.spec.ts` measures the
  label rather than the box. `$header-height-landscape` is derived from the
  floor rather than set to 40, because a bar cannot be shorter than the tallest
  thing standing in it. The board's forty cells are the one exemption: 27px on a
  336px board, and a 44px square is not a board.
- **A button casts no shadow, and it must not fade its colour either.** The
  hover used to lift 1px over `$emboss-press`, a hard 5px blurless offset. That
  treatment is right on the board's ribbon and on the die because those are
  OBJECTS; on chrome it read as a toy, and on touch it LATCHED - Android holds
  `:hover` after a tap, so a button you had just pressed stayed raised over a
  slab of ink until you pressed something else. Press feedback is `:active`
  now, which cannot latch. The obvious replacement, fading the background
  instead, is a second trap and `appearance.spec.ts` caught it within one run:
  an appearance is a `data-theme` swap, so a colour transition makes every
  button fade into the new palette while the whole page around it flips at
  once. Buttons transition nothing, which is also what `.app-nav-link` and
  `.board-space` already did.
- **A bespoke `min-height` on one button in a row is how a row becomes two
  sizes.** `.turn-controls .end-turn-button` carried 58px while
  `.dice-roll-button` narrowed its own padding back to `$space-4` - two
  overrides in the row a player looks at every turn, pulling opposite ways, so
  End turn stood fourteen pixels taller and wider than Roll dice beside it.
  Both are gone; the base states the size once. The DICE are still a different
  size from the button next to them, and that is right: they are objects, not
  controls, which is why `controls.spec.ts` measures `button` and not the row.
- **The player card was 100px for a name and three numbers**, in the scarcest
  column in the app. 46 of it was the head, because the label sat ABOVE its
  figure and the `.eyebrow` in it carried the global type layer's 8px bottom
  margin straight through the block's own declared `gap: $space-hair` - two
  spacings for one relationship, and the declared one was decoration. Inline
  on a phone, with the paddings a rung down, it is ~67px and loses no fact. A
  player's NAME is arbitrary text, so it needs `text-overflow: ellipsis` and
  not just `min-width: 0`: the flex item shrank and the text wrapped anyway.
  **Compacting it broke a test's premise rather than the test** - eight
  expanded players then fitted a 740px phone, so "a full table" stopped being
  a full column. Height is what fills a column; the player count only used to.
- **Every control in the app is `$control-tap` tall - fields included.** A text
  field was 48px because that is what `body` leading plus 12px of padding came
  to, and a button beside it was 44, so every form row was four pixels out of
  line. A field also inherited the label's bold weight through the reset's
  `font: inherit`, so what the player typed came out bold; it is deliberately
  NOT given a smaller role with the fix, because a field under 16px makes iOS
  zoom the page on focus.
- **The deed card clipped on three of the four editions, and the cause was the
  TITLE, not the card.** `.deed-card` is a fixed height with `overflow: hidden`
  - deliberately, so it does not resize as you move around the board - so
    anything too tall is cut off silently rather than scrolled to. At `display`
    (1.7rem) the longest street name on the US and London boards wrapped to two
    lines, which is 408px of content in a 380px card, and the building-cost
    footer went off the bottom: nobody could see what a house costs. At `title`
    (1.42rem) every street name in every edition sets on one line. Growing the
    card instead would have moved the auction and trade panels, which measure
    themselves from the same token, to fix a name that was simply too big for its
    own card. The card did grow, but only from 380 to 392, because the tallest
    deed then measured exactly 380 and zero slack is how this comes back.
    `overlays.spec.ts` plays the **Atlantic City** board for this: India's
    longest street is "Bhubaneshwar", which has always fitted, so the test would
    pass on the default edition while proving nothing.
- **A phone override of a type role must come LAST in its file.** The rule it
  overrides is the same specificity and a media query adds none, so source
  order is the whole of what decides it - written beside the rule it modifies,
  a phone override loses silently and looks like it never compiled.
  `components/_space-detail.scss` keeps its phone tier in one block at the end
  for that reason, and the deed's title spent one round trip proving it.
- **A modal is measured on the frame it has to fit, and that is 360x640.**
  `VIEWPORTS.android` exists because `phone` (375x812) is neither the narrowest
  nor the shortest window in the field, so it could not see that the buy
  decision rendered **632px tall inside a 640px window** - the modal scrolled
  internally and Buy, the whole reason it was up, sat below the fold. The
  street case is the one that matters: seven rent rows against a railway's
  four, which is why the test plays on until a street is on offer rather than
  accepting the first purchase it meets.
- **Every measurement a partial writes comes from a scale, and a guard says so.**
  [design-system.md](docs/design-system.md) is the reference and `#/style` renders it.
  Space is a 4px grid (`$space-N`, the number IS the multiple); type is a **role**
  reached through `t.text(role)` that carries size, leading, weight, tracking, family
  and case together; elevation is `$elevation-N var(--shadow-ink)`, geometry fixed and
  ink themed; motion lives inside `m.motion { }` so the still state is the default.
  Three traps worth knowing before touching any of it:
  **`text()` emits the `font` shorthand**, so anything set _before_ the include -
  a weight, a family - is discarded silently; put the role first. **A Sass `@error`
  in a partial nothing `@use`s is dead code**, which is why `_tokens.scss` forwards
  `_scale.scss` rather than leaving it unreferenced. And **a custom property's value
  and an at-rule's condition are not Sass expressions**, so a variable in either must
  be interpolated - `--token-size: t.$x` emits literal text and breaks silently.
- **Player-facing copy has a shape, and it is written down.** [conventions.md](docs/conventions.md)
  section 3d: a `*BlockedReason` is a **fragment** with no terminal full stop, anything else the
  player is told is a **sentence**, a button is verb plus object, second person for the player and a
  name for anybody else, and a kind of square is never spelled into a string. There was no such
  convention until now, which is why the 32 refusals had grown four voices and two punctuation
  styles, one rule was stated twice in different words, and "we cannot find that game" had four
  spellings across three files. `blockedReasons.guard.test.ts` sweeps the board and fails on a
  refusal in the wrong shape. Rewording is safe from the sound and toast systems - `GameEventCue` is
  set where an event happens and is no longer regex-matched from the sentence - so nothing but the
  convention stops it drifting again.
- **The engine names a square in the edition's own word too, not just the booklet.**
  [nouns.utils.ts](src/domain/themes/nouns.utils.ts) is `nounsFor` and `countSites`, and it is to
  `nouns` what `money()` is to the currency symbol. The build and sell refusals said "Only streets
  can be built on" on all four boards; two of them call them cities, and India - which does - is the
  **default** edition, so the most-seen refusal in the app named something the board did not have.
  A name and "You" cannot share one sentence either, because they do not share a verb form: the
  trade refusals read "You does not have that much cash" until `TradeSide` carried the person
  alongside the name.
- **The rules booklet is edition-aware, and its vocabulary lives on the theme.** The printed rules
  are identical in every edition - only the names, the money and the _words_ differ. So each theme
  carries a `nouns` block (`site`/`sites`/`railway`/`railways`): India has cities and railway
  stations, the US streets and railroads, London streets and stations, and the World board flies
  between airports. One set of prose reads them, so a rule cannot be right in one edition and wrong
  in another; `themeNouns.guard.test.ts` fails on a new edition that forgets one, on a capitalised
  one (they are interpolated mid-sentence), and on a plural equal to its singular.
  The booklet follows **the game you are in**, and with no game open reads
  **generically** - `GENERIC_NOUNS` and no currency symbol at all, because
  `formatMoney(1500, '')` is `1500` and a bare number is the honest way to state a rule that is the
  same in every currency. It is deliberately not the default edition: India's words are wrong for
  three of the four boards. Threaded by context rather than props, which is a considered exception -
  eleven prose sections need the same three facts and take no other prop.
- **`rulesSync.test.ts` pins India's currency symbol explicitly, and must.** It computed
  `formatMoney(x)` with no symbol and leaned on `DEFAULT_CURRENCY_SYMBOL` being `₹`, which happened
  to match `docs/india-edition-rules.md` - a transcription of the India booklet, which it will
  always be. Now that the booklet renders whichever edition is in play, an implicit default would
  make that guard compare the doc against a symbol nobody chose, and it would pass while proving
  nothing. `board.rules.test.ts`, `ruleCoverage*` and the doc itself stay India-specific on purpose:
  they are the transcription and its fixtures.
- **A theme is one file, and the economics are not in it.** `src/domain/themes/<name>.theme.ts`
  carries what makes an edition _that_ edition - its name, currency, pieces, the forty square names
  and the board's centre - and `themes.registry.ts` lists it. Prices, rents and rules live once in
  [boardLayout.constants.ts](src/domain/themes/boardLayout.constants.ts), because they genuinely are
  the same: Old Kent Road, Mediterranean Avenue and Guwahati are all the cheapest brown at 60 renting
  2, in every licensed edition. That split is what keeps a new theme to forty strings and stops two
  editions drifting into two subtly different games. **The ruleset picker used to select nothing** -
  `createGameState` read `indiaEditionBoard` outright - so it set a name and a currency and then
  dealt the same forty Indian cities whatever it said. The cards are built from the theme too; they
  used to hardcode `DEFAULT_CURRENCY_SYMBOL`, so a London board would have promised rupees. Still
  outside the theme file: its **palette**, which stays in `styles/themes/_themes.scss` keyed by the
  theme's `id` - moving it in is the next phase, so today a theme is that file plus one SCSS block.
- **The board's grid tracks are written twice and must agree.** `$board-corner-track: 1.7fr` in
  `_tokens.scss` lays the squares out; `CORNER_TRACK = 1.7` in
  [boardLayout.utils.ts](src/domain/board/boardLayout.utils.ts) computes every token's `left`/`top`
  **percentage**. Neither can be derived from the other across the Sass/TypeScript boundary, so a
  change to one alone leaves every piece sitting slightly off its square — on a board whose whole
  point is pieces on squares. Nothing tied them together until
  [boardTracks.guard.test.ts](src/domain/board/boardTracks.guard.test.ts), which reads the SCSS.
- **`margin: 0 auto` shrink-wraps a flex item, beating `align-self: stretch`.** `.page` carries it,
  so the moment `.app-shell` became a flex column for the phone frame the whole layout collapsed and
  the board measured **263px wide in a 375px viewport**. The frame resets the margin and sets a
  width. `.game-layout`'s `align-items: start` does the same thing on the cross axis once the layout
  is a column. Both cost a measurement to find and nothing to fix.
- **A flex item shrinks before it overflows, so a column that should scroll silently compresses.**
  Releasing the player stack's inner scroller for the phone frame squeezed the region and spilled its
  cards _out_ of it, over the sticky action bar, with `.game-side` reporting
  `scrollHeight === clientHeight` — no scroll, and the last card permanently underneath the bar.
  `.game-side > * { flex: 0 0 auto }` is what makes the column genuinely taller than its box, which
  is the only thing a sticky bar can stick over. The e2e test asserts the overflow, not just the
  clearance.
- **The theme contract's guard has a third direction the Sass cannot check.** It `@error`s on a
  palette missing a contract token and on one defining a token outside the contract, but not on a
  token that is in the contract, defined everywhere, and **read by nothing** - Sass cannot scan the
  other stylesheets. Six were living there (`decision-bg`, `decision-border`, `token-bg`,
  `action-sell`, `action-redeem`, `action-text`), and every palette had to invent values for them.
  [themeContract.guard.test.ts](src/styles/themeContract.guard.test.ts) closes it, so **add a
  contract token in the same change as the rule that reads it, not before.**
- **A dark appearance is honest now, and getting there is the design system's own receipt.**
  `midnight` sat fully defined and unselectable because three things were literals in component
  partials rather than palette decisions - a hardcoded white dice gradient with near-black pips,
  dark-translucent scrims, and ink-tinted drop shadows. All three read correctly under a light
  palette and wrongly under a dark one, and nothing about theming could reach them. They are
  contract tokens now, so shipping it took **one row** in `APPEARANCES`.
  The sweep afterwards found what only a selectable palette exposes: `.danger-button` paired
  `--danger-bg` with `--text-inverse`, an assumption that holds in a light palette and renders
  black-on-black at **1.03:1** in a dark one - so danger has its own `--danger-text` now, like every
  other button variant. The same sweep found `aesthetic`'s eyebrow at **3.24:1**, shipped and
  unnoticed. **Point a contrast probe at a new palette before shipping it**; the guards check that
  a token is used, never that the result is legible.
- **The header paints above the decision backdrop, and the side drawer starts below the header.**
  The backdrop is a fixed sheet over the whole viewport at `z-index: 40`, so an unpositioned header
  meant the app's only navigation went dead the moment a card or a buy decision came up - no rules,
  no mute, no way out. The controls used to sit in the game sidebar, which is under the backdrop
  too, so moving them into the header only made a pre-existing dead zone obvious. Raising it then
  covered the side drawer's own close button, because that drawer is top-anchored - hence
  `.drawer-backdrop { inset: var(--app-header-height) 0 0 }`. Found by a sound test failing after a
  reload, not by looking.
- **The board's phone cap is a fraction of the FRAME, not the viewport.** `min(100%, 54dvh)` was
  54% of the window; with a header the frame is shorter than the window, so the board kept its old
  share, squeezed `.game-side` and spilled its cards under the sticky bar. It is
  `calc(var(--app-frame-height) * 0.54)`, and `--app-frame-height` is `100dvh` minus
  `--app-header-height` - published on `.app-shell` so every `calc()` reads one source. The same
  property replaced the bare `72` in `.game-side`, which is now `$shell-frame-reserve`.
- **`--shell-pad` exists so the header can negate it.** `.app-shell`'s padding is a `clamp()`, and
  the header has to break out of it to sit flush with the window; two copies of that clamp would
  drift. The phone game frame sets `--shell-pad: 0px` because it has no padding to escape, and the
  landscape block overrides the header's margin outright rather than negating its 5px - negating it
  made the header 27px wider than the window and pushed it off both edges.
- **An index entry is not `GameState`, and `tableMode` on it is `.default()`ed for a reason.**
  `storedGameIndexEntrySchema` parses and **throws**, and `bootstrapRecentGames` turns a throw into
  `setRecentGames([])` plus a load error - so a _required_ new key there would make every index
  written by an older build fail validation and **every saved game vanish from the front door**,
  with its per-game save sitting intact on disk beside it. The index has no version of its own, so
  this needs no `GAME_STATE_VERSION` bump; `.default(TableMode.HotSeat)` is what makes an old entry
  readable, and the index self-heals on the next save. The test for it builds the old index **by
  hand** - projecting a state through the current `toStoredGameIndexEntry` would always include the
  field and pass vacuously.
- **An online game is saved locally like any other, and rejoining it needs the code.** The join code
  lived only in `seat.joinCode` and the lobby URL's `?code=`, which the game URL does not carry, and
  `restoreSeat` was dispatched nowhere - so a refresh mid-game loaded the state, attached no session,
  and `resolveViewer` failed closed to Spectator: a frozen game on your own save.
  `monopoly.code.<gameId>.v1` holds it per device, written on create, on join and on attach;
  [useTableRejoin](src/features/multiplayer/hooks/useTableRejoin.ts) puts the device back on the
  table on a cold load. Its guard is `session.gameId` read through a **ref** - the one fact that
  answers "already attached" without reading `sessionEpoch`, `connection` or `seat.joinCode`, all of
  which the attach itself writes. And it checks `isOnlineEnabled()` first, because
  `attachOnlineSession` goes through `requireConfig()`, which **throws** - and a throw inside an
  effect reaches nothing but `ErrorBoundary`, so an online save on a server-less build would render
  as a crash.
- **A code-only lookup is a real if modest weakening, and it is written down.** `find_game_by_code`
  (migration 0004) means a blind attacker needs 30 bits rather than a uuid _and_ a code. It returns
  the id and the phase and nothing else, and reading the table still takes the code, so a correct
  guess buys exactly what the code alone buys. There is no rate limiting available inside a
  `security definer` function. See [docs/features/multiplayer.md](docs/features/multiplayer.md).
- **A shared grid utility is not a layout.** `.player-metrics` sat in the
  `.field-grid.two, .two-column, .player-metrics` list in `layout/_shell.scss`, which collapses to
  one column below `$breakpoint-tablet`. Right for a form field, wrong for a pair of labelled
  figures: two figures became four stacked rows and the player card grew to about **300px** on a
  phone for a name and three numbers. It is a `<dl>` of explicit pairs owning its own layout now,
  and the card is ~88px.
- **`.player-card-open` had no rules anywhere and no content**, so the control that opens a
  player's holdings rendered as a tiny default browser pill - it read as a rendering artefact
  rather than as something to press. It is an `inset: 0` overlay over the whole card (so the tap is
  well past 44px) with a visible chevron, hidden on collapsed slivers because the stack's own
  expand overlay owns the click there.
- **The property-action rail is back, and the objection that removed it is answered.** It listed
  Build/Sell/Mortgage/Redeem and every one of them needs a `spaceId`, which a rail does not have -
  so it went, and the site panel became the only way in. Now the rail offers the action and a
  picker sheet supplies the site, listing ONLY what the command will accept.
  `getPlayerActionOptions` ([playerActions.utils.ts](src/domain/rules/playerActions.utils.ts))
  maps the holder's spaces through `getSiteActions`, so **not one rule is restated** and a live
  button is always a command that will succeed. The holder is `getAssetHolderId`, never the active
  player - during a liquidation it is the debtor's holdings that are on offer. Every button is
  always rendered and a dead one carries its refusal in `title`; a row that changes shape cannot
  be learned, and a dead control with no reason is the Buy bug again. The aggregate refusal
  prefers the ONE reason when the holdings agree, because "Already mortgaged" beats a summary of
  itself. See [docs/features/property-actions.md](docs/features/property-actions.md).
- **The phone HUD is two columns of players with the dice between them, and it is ONE dom.** The
  desktop fan and the phone grid are the same markup: the middle slot is a `<div>` among
  `<article>` cards, so it is invisible to every `:nth-of-type` rule the fan is built from. The
  fan's measurements are custom properties (`--stack-peek`, `--sliver-content`, ...) so the phone
  tier turns it off by redeclaring seven values - and that is not a style: `--sliver-content` is
  read FIVE classes deep, and a custom property inherits, so the reader's specificity does not
  matter. A media query that tries to override those selectors directly loses however late it
  comes, which cost two rounds of measuring to see. The resets also have to sit on
  `.player-stack.is-collapsed`, not `.player-stack`, for the same specificity reason.
- **Order is by seat; DOM order is still turn order.** `selectPlayerSummaries` keeps returning the
  active player first, because that is what makes the fan's top card the active one. The grid
  reorders with CSS `order` off `data-seat`, so a player keeps their cell all game rather than
  jumping every turn, and `.is-active` carries the emphasis that `:first-of-type` used to.
- **The dice are drawn twice and rolled once.** `DicePair` is mounted in the dock and in the HUD's
  middle column and the stylesheet shows one; `GameSidebar` owns the single `useDiceRoller`. That
  is not tidiness - **the hook plays the roll sound**, so a second call sounds every throw twice.
  The two mounts need separate test ids, because two elements answering one id is a Playwright
  strict-mode failure even when one is `display: none`. The Roll button stays in the bar on every
  viewport: `controls.spec.ts` pins every control in that row at exactly 44px and a ~90px column
  cannot hold one with a real label.
- **The board asks the BOARD how big it is, not the window.** Everything drawn on a square - the
  type, the glyph, the colour ribbon, the owner bar, the insets - is a `cqw` function of
  `.board-card`, and its two thresholds are `@container` queries. That is not a style preference:
  landscape sizes the board by viewport _height_, so an 812x375 phone has an 812px window and a
  320px board, and a 768px tablet renders a ~370px board in a 768px window. A viewport rule misses
  both - the first attempt reported "not a phone" and left 6.72px names on a board exactly as small
  as the portrait one it had correctly cleared. **If a rule is about how big the board is, ask the
  board.**
- **Every square prints its name AND its price, at every size.** It used to do neither on a phone:
  below a 520px board the name was deleted and the price was never drawn anywhere. A street was
  then a colour ribbon and a 5px dot with nothing identifying it, because streets carry no glyph.
  The geometry allows it - rows 1 and 11 are 1.7fr _deep_ against 1fr wide, so a square is ~30x51
  and two runs of type fit side by side. `.space-text` is `flex-direction: column`, the BLOCK axis,
  which serves all four sides at once; `row` puts the price before line one of the name, because
  `vertical-rl` stacks lines right-to-left.
- **Two tiers, both measured, and no others.** `$board-short-name-floor` (420px board): the four
  railways and two utilities print the edition's own word for what they are, because "Chennai
  Central Railway Station" is four wrapped lines at any size and four lines plus a price breaks the
  5px floor below a 347px board. `$board-tight-floor` (300px board): the type itself drops to
  4.2px, for the narrowest device only - at 320x568 the height cap leaves a 281px board where
  "Islington" alone needs 30.6px of a 27.8px run. Both names render and CSS picks one; CSS cannot
  substitute text and a JS width check is not how layout is done here.
- **Ownership is a bar and a wash, not a dot.** A 5px dot was a quarter of a phone cell and had to
  be hunted for on each square. The bar runs the full outer edge in the owner's token colour
  (inline - a player colour is theme DATA, the sanctioned exception), and `.is-owned` washes the
  square with `color-mix(... 14%, transparent)` over `--space-owner`. Two traps: the bar sits at
  **z-index 4**, below the cell's `::after` divider at 5, or it erases the grid line it is painted
  over; and `.space-label` reserves `--owner-bar-weight` on that edge **whether or not anyone owns
  the square**, or a street re-wraps its name the moment somebody buys it. `.board-space` had to
  move from the `background` shorthand to `background-color` for the wash to survive hover.
- **The square's name survives as its `aria-label`.** Swapping the visible name for a short one is
  safe precisely because `BoardSpaceCell` sets an explicit `aria-label` with the full name, so
  `getByRole('button', { name: /View details for/ })` and every screen reader are untouched. Never
  move that name into the visible text alone.
- **The clipping scan can pass by proving nothing, and did.** `board.spec.ts`'s "never clips a
  space name" compares `scrollWidth` to `clientWidth`, and a `display: none` element reports zero
  for both - so while the phone hid its names it was vacuous there. It is desktop-pinned, and
  `mobile.spec.ts` now carries the phone sweep, which checks containment in the cell as well as
  self-overflow and guards its own vacuity on the board width and the element count. The 320px
  case plays the **London** board on purpose: India's longest street is "Bhubaneshwar", which has
  always fitted, so the default edition would prove nothing - the same trap `overlays.spec.ts`
  documents for the deed card. Two real defects only ever showed there: a leftover
  `align-self: center` that shrink-wrapped every line instead of giving it the cell's run, and a
  7px literal colour ribbon that should have been a fraction of the board.
- **`.rules-booklet` negates the shell's phone padding to bleed full width.** Both sides now come
  from `$shell-pad-phone`; they were two independent `10px` literals that cancelled by coincidence,
  so changing the shell's padding left the booklet inset or overhanging.
- **Page spacing belongs to the page, never to the shell.** The header negates `.app-shell`'s
  padding (via `--shell-pad`) to sit flush with the window, so any padding a page adds to the
  _shell_ lands **above** the header instead of below it. `.rules-shell` did exactly that with
  `padding-block: clamp(28px, 5vw, 72px)`, which is why the booklet's h1 sat against the header's
  border with only 10px on a phone. It is `padding-block` on `.rules-page` now, and
  `navigation.spec.ts` asserts a non-zero gap on every route.
- **`env()` needs a fallback or it is zero.** The sticky dice bar's only bottom spacing was
  `padding-bottom: env(safe-area-inset-bottom)`, which resolves to **0** in Playwright, in DevTools
  emulation and on any device without `viewport-fit=cover` - so a 58px button row sat flush against
  the screen edge. It is `calc($gap-sm + env(safe-area-inset-bottom, 0px))`, and `index.html` now
  asks for `viewport-fit=cover` so the inset is real where it exists.
- **The activity log is a header control, and the tokens are the header's own.** It used to be
  `position: fixed` bottom-left over the board and then `position: static` on a phone - two
  treatments for one button, the second because the first landed exactly on the dice. It is passed
  to `AppShell` as an `activity` slot by `GamePage` alone, so it appears on the game route and
  nowhere else. `$floating-inset` went with it: nothing floats over the board any more.
- **`tsconfig.json` is `strict: true`, target `es2020`**, and typechecks every file under `src/` — there is no `exclude`.

---

## Documentation contract

Docs here are load-bearing: `CLAUDE.md` is read into context every session, so a stale line actively misleads. **Update docs in the same change as the code**, not afterwards.

| If you change…                                      | Update                                                                                                     |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Engine commands, phases, or constants               | §4 above                                                                                                   |
| `GameState` shape or storage keys                   | §5 + bump `GAME_STATE_VERSION` + zod schema                                                                |
| Layer boundaries, new directory                     | §3 + `docs/architecture.md`                                                                                |
| Ruleset behaviour or values                         | `docs/india-edition-rules.md` **and** the in-app booklet — they must stay in sync; see below               |
| **Adding or changing a rule**                       | give the row an id, and name a test for it in `RULE_COVERAGE` — `rulesCoverage.test.ts` fails until you do |
| Scripts in `package.json`                           | §6                                                                                                         |
| Fixing/adding duplication or a known bug            | the §7 DRY table / §8 list — remove rows you resolve                                                       |
| Adding tests, or fixing a harness blocker           | the coverage table / blocker list in [docs/coding-guidelines.md](docs/coding-guidelines.md) §5             |
| Conventions, testing policy, definition of done     | [docs/coding-guidelines.md](docs/coding-guidelines.md)                                                     |
| An ESLint rule                                      | [docs/conventions.md](docs/conventions.md) §1 and the §8 enforcement table                                 |
| **Adding or removing any file**                     | [docs/file-index.md](docs/file-index.md) — one line saying what it does                                    |
| **Adding a feature**                                | a new [docs/features/](docs/features/) doc from `_template.md`, plus its row in the features index         |
| Changing a feature's behaviour or decisions         | that feature's doc in `docs/features/`                                                                     |
| Adding a theme, or changing theme tokens            | [docs/theming.md](docs/theming.md)                                                                         |
| A scale, a token, or anything a partial reaches for | [docs/design-system.md](docs/design-system.md) — and the `#/style` page renders it                         |

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
