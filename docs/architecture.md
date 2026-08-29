# Architecture

Deep reference for the active application. For the short version read [CLAUDE.md](../CLAUDE.md); for ruleset values read [india-edition-rules.md](india-edition-rules.md).

Keep this file in step with the code — see the Documentation contract in CLAUDE.md.

---

## 1. Layer map

```
┌─────────────────────────────────────────────────────────────┐
│ features/  pages, slices, thunks, persistence               │  React + Redux aware
│   HomePage · GamePage · RulesPage · gameSlice · uiSlice      │
└───────────────┬──────────────────────────┬──────────────────┘
                │                          │
    ┌───────────▼──────────┐   ┌───────────▼───────────────────┐
    │ components/game/     │   │ domain/                       │
    │ DiceDock             │   │ types · rules · board         │
    │ SpaceDetailCard      │   │ cards · themes · rng          │
    │ props in, events out │   │ PURE: no React/Redux/DOM      │
    └──────────────────────┘   └───────────────────────────────┘
```

Allowed import edges: `features → components`, `features → domain`, `components → domain (types only)`, `app → features`.
Forbidden: anything `domain → *`. If `src/domain/` ever imports React, Redux, or touches `window`, the boundary has broken.

`src/app/` holds only store wiring (`appStore.ts`) and typed hooks (`hooks.ts` → `useAppDispatch`, `useAppSelector`). Always use the typed hooks, never bare `useSelector`.

---

## 2. Domain model

All types live in one file, [`src/domain/types/game.ts`](../src/domain/types/game.ts). It is the single source of truth — extend it there rather than declaring local shapes.

### Board spaces
`BoardSpace` is a discriminated union on `kind`:

| kind | extra fields |
|---|---|
| `street` | `colorGroup`, `price`, `mortgageValue`, `houseCost`, `hotelCost`, `rents: StreetRentTable` |
| `railway` | `price`, `mortgageValue`, `rentByCount: [1,2,3,4 owned]` |
| `utility` | `price`, `mortgageValue`, `rentMultiplierOne`, `rentMultiplierBoth` |
| `tax` | `amount` |
| `go`, `chance`, `community-chest`, `jail`, `free-parking`, `go-to-jail` | none |

Narrow on `kind` — never cast. Space ids are positional: `space-<index>`, indices `0..39`.

### GameState (persisted root)
`version`, `id`, `name`, `themeId`, `rulesetId`, `status`, timestamps, `players` (keyed by id), `playerOrder`, `activePlayerIndex`, `turnNumber`, `board`, `ownership` (keyed by space id), `bank`, `decks`, `turn`, `pendingDecision`, `tradeState`, `auctionState`, `history`, `winnerPlayerId`.

Two things to note: **`board` is serialised into every save** (so board data changes don't retroactively apply to existing saves), and `ownership` only has entries for buyable spaces.

### Cards
`DeckCard.effect` is a union: `collect`, `pay`, `move-to`, `move-steps`, `go-to-jail`, `jail-free`, `collect-from-each`, `pay-each`. Adding an effect kind means updating both the type and the `switch` in `resolveCard`.

Drawn cards are returned to the **bottom** of their deck; `jail-free` cards are removed from the deck and held by the player.

---

## 3. Turn state machine

```
                    ┌──────────────┐
       endTurn ────►│  await_roll  │◄──── advanceToNextTurn (player not jailed)
                    └──────┬───────┘
                 rollTurnDice │
                    ┌────────▼──────────┐
                    │ resolving_movement│  move, collect GO, 3× doubles → jail
                    └────────┬──────────┘
                             │ resolveCurrentSpace
              ┌──────────────┼───────────────────┐
              ▼              ▼                   ▼
     ┌────────────────┐  ┌──────────────────────────┐  ┌───────────────┐
     │ await_decision │  │ await_extra_roll_or_end  │  │ turn_complete │
     │ buy / auction  │  │ (rolled doubles)         │  │               │
     │ jail / liquid. │  └───────────┬──────────────┘  └───────┬───────┘
     └───────┬────────┘              │  endTurn → await_roll   │ endTurn
             │ decision resolved     │                         │ → next player
             └───────────────────────┴─────────────────────────┘
```

`pendingDecision` is the gate: while it is anything other than `{type:'none'}`, `resolveCurrentSpace` forces `await_decision` and blocks extra rolls. `advanceToNextTurn` opens the next player's turn in `await_decision` with a `jail-choice` if they are jailed.

`PendingDecision` variants: `none`, `landed-unowned-property`, `auction-bid`, `jail-choice`, `asset-liquidation`, `trade-response`, `bankruptcy-resolution`, `game-over`. The last four have UI or engine work still outstanding.

---

## 4. Engine internals

[`src/domain/rules/gameEngine.ts`](../src/domain/rules/gameEngine.ts) — one file, two exports.

**`createGameState(input, randomSource)`** — builds players (`player-1..n`, `M1500` each), decides turn order by a simulated opening roll (`chooseFirstPlayerOrder`), shuffles both decks, seeds `ownership` for buyable spaces, writes two opening history events.

**`executeGameCommand(state, command, randomSource)`** — a `switch` over command type. Throws on illegal transitions; scaffolded commands push a string into `uiHints` and change nothing.

Internal helpers worth knowing before adding logic (reuse these instead of writing new ones):

| Helper | Purpose |
|---|---|
| `updatePlayer(state, id, fn)` | immutable player update |
| `updateSpaceOwnership(state, id, fn)` | immutable ownership update |
| `appendEvents(state, events)` | prepend to history, cap 120, stamp `updatedAt` |
| `movePlayerTo(state, id, pos, collectGo)` | move + pass-GO salary |
| `resolveBankPayment` / `resolvePlayerPayment` | pay, or raise `asset-liquidation` if short |
| `resolveCurrentSpace` | the landing-resolution core |
| `getStreetRent` / `getRailwayRent` / `getUtilityRent` | rent maths |
| `ownsEntireColorSet` | monopoly check (doubles base rent) |
| `sendPlayerToJail`, `startAuction`, `completeAuctionIfPossible`, `advanceToNextTurn`, `resolveCard` | flow transitions |

**Rent rules as implemented:** streets use build level 1-5 → house/hotel rents, else `monopolyRent` if the owner holds the whole colour group, else `baseRent`. Railways read `rentByCount[owned-1]` off the first railway space. Utilities multiply the last dice total. Rent is skipped entirely if the property is mortgaged or self-owned.

**Auctions** are mandatory after a decline, open at `M10`, and rotate through every non-bankrupt player; the auction closes when at most one bidder has not passed.

### Purity caveat
The engine calls `crypto.randomUUID()` (event/auction/game ids) and `new Date().toISOString()` (timestamps) directly. Dice are injectable via `RandomSource`, so rules are testable — but snapshot-comparing whole states across runs will not work. If full determinism is ever needed, inject a clock and id source the same way `RandomSource` is injected.

---

## 5. Persistence

[`features/persistence/persistence.ts`](../src/features/persistence/persistence.ts) — plain `window.localStorage`, no async.

- `saveGame` writes the full state under `monopoly.game.<id>.v1` and rewrites the index at `monopoly.games.index.v1`, sorted by `updatedAt` descending.
- `loadGame` / `loadGameIndex` parse through zod ([`schema.ts`](../src/features/persistence/schema.ts)) and **throw** on invalid data; `gameSlice` catches and surfaces `loadError`.
- `StoredGameIndexEntry` is a denormalised summary for the home screen (names, turn, status) so listing saves never needs to parse full states.

The schema currently uses `z.any()` for `players`, `board`, and `ownership` — corruption inside those goes undetected. Tighten as you formalise each shape.

---

## 6. UI composition

**`GamePage`** renders a CSS-grid board. `boardToGridPosition(index)` maps index `0..39` onto an 11×11 grid (bottom row right-to-left, then up the left column, across the top, down the right). The centre is a fixed `grid-area: 2/2/11/11`.

`renderDecisionPanel()` switches on `pendingDecision.type` to render the buy/auction/jail/liquidation panel. **New decision types need a branch here, or the game will silently stall** with no way to advance.

Clicking any space opens `SpaceDetailCard` (title-deed modal, `role="dialog"`). `DiceDock` is a fixed-position roller that animates for ~520 ms, plays a sound, then fires `onRoll` — so the visible dice are decorative and the authoritative values come back from the engine in `turn.lastRoll`.

**`HomePage`** owns setup form state locally (name, count 2-8, per-player names and tokens), validates non-empty + unique names + unique tokens, then dispatches `createNewGame` and navigates to `/game/:id`.

---

## 7. Extension recipes

### Add a game command
1. Add the variant to `GameCommand` in `domain/types/game.ts`.
2. Implement the `case` in `executeGameCommand` — reuse the helpers in §4; return new state, never mutate.
3. If it introduces a decision, add the `PendingDecision` variant **and** a branch in `renderDecisionPanel()`.
4. Unit-test it with `SeededRandomSource`.
5. Remove it from the scaffolded list in CLAUDE.md §4.

### Add a theme
Add a `ThemeConfig` next to `indiaEditionTheme` and include it in `availableThemes`. Both the setup form and the game view read that array. A theme needs at least 8 tokens (max player count).

### Change board data
Edit `domain/board/indiaEditionBoard.ts` via the `street/railway/utility/tax/action` builders. Remember: existing saves embed their own board copy and will not pick up the change — bump `GAME_STATE_VERSION` if the shape (not just values) changes, and update `docs/india-edition-rules.md`.

### Add a board space kind
Extend `SpaceKind` + the `BoardSpace` union, then handle it in `resolveCurrentSpace`, `getSpaceColor`/icon maps in the UI, and `SpaceDetailCard`. TypeScript will point at most sites; the icon/colour maps are `Partial<Record<...>>` and will **not** error on a missing entry — check them by hand.

---

## 8. Build and test

- **Vite** (`vite.config.mjs`): dev port 3000, output `build/`, base `/monopoly/` in production for GitHub Pages. Also hosts the Vitest config (jsdom, globals, `src/**/*.test.{ts,tsx}`, setup `src/setupTests.ts`).
- **NX** (`project.json`) wraps Vite for `serve`/`build`/`test`/`lint` with caching.
- **Playwright** (`playwright.config.ts`): `tests/e2e`, auto-starts the dev server, reuses a running one.
- **TypeScript**: `strict: false`, `target: es5`, path aliases declared but unused.

Test layering: pure rules → engine unit tests; page behaviour → RTL via `renderWithProviders`; user journeys → Playwright.
