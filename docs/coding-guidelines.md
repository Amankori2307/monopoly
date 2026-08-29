# Coding Guidelines

Binding rules for all work in this repository. [CLAUDE.md](../CLAUDE.md) is the quick context; [architecture.md](architecture.md) is the structural map; this file is **how we write and verify code**.

---

## 1. The testing mandate

> **Every feature, entity, and behaviour ships with unit, integration, and e2e coverage. No exceptions taken silently.**

A change is not done when it works. It is done when it is _proven_ to work at all three levels. If you add a game command, a slice, a page, a board entity, or a rule — you add all three kinds of test in the **same change**.

### What each level means here

| Level           | Proves                                                                                                        | Lives in                                   | Tool                      | Boundary                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------- | ------------------------------------------- |
| **Unit**        | One pure function or module behaves correctly, including edge cases                                           | `src/**/<name>.test.ts` beside the source  | Vitest                    | No React, no store, no DOM, no storage      |
| **Integration** | Layers wired together behave correctly — thunk → engine → persistence → store, or page → dispatch → re-render | `src/**/<name>.test.tsx` beside the source | Vitest + RTL + real store | Real store, real localStorage, no browser   |
| **E2E**         | A user can actually complete the journey in a real browser                                                    | `tests/e2e/<journey>.spec.ts`              | Playwright                | Real browser, real navigation, no internals |

The three are not redundant. Unit tests catch wrong maths, integration tests catch wrong wiring, e2e tests catch a button that renders but never fires. A bug class that escapes all three is the only acceptable reason one was missing.

### Definition of Done

Copy this into your working notes and satisfy every line before reporting a task complete:

- [ ] Unit test covers the happy path **and** every error/guard branch
- [ ] Integration test covers the layer wiring, including the persisted result
- [ ] E2E test covers the user-visible journey (added or extended)
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm test` green
- [ ] `pnpm test:e2e` green
- [ ] Docs updated per the contract in CLAUDE.md
- [ ] **Feature doc** added or updated in [features/](features/) (new feature → copy `_template.md`)
- [ ] **[file-index.md](file-index.md)** updated if any file was added, removed, or repurposed
- [ ] No new entry added to the DRY debt table — existing duplication touched is extracted

### Test naming

Describe the behaviour, not the function. `it('starts an auction when the landed property is declined')`, never `it('works')` or `it('tests declineLandedAsset')`. The test name is the specification.

---

## 2. How to test each layer

### Domain rules — unit

Pure and dice-injectable, so these are cheap. Always pass a `SeededRandomSource` to make dice deterministic.

```ts
import { describe, expect, it } from 'vitest';
import { createGameState, executeGameCommand } from './gameEngine';
import { SeededRandomSource } from './rng';

it('charges double base rent when the owner holds the whole colour set', () => {
  const game = createBaseGame(); // shared factory, seeded
  // arrange ownership directly on the state, then:
  const result = executeGameCommand(
    game,
    { type: 'rollTurnDice' },
    new SeededRandomSource(2)
  );
  expect(result.nextState.players[tenantId].cash).toBe(expectedCash);
});
```

**Also unit-test the throws.** Every `throw new Error(...)` in `executeGameCommand` is a branch and needs a case:

```ts
expect(() => executeGameCommand(game, { type: 'buyLandedAsset' })).toThrow(
  'There is no property awaiting purchase.'
);
```

Note: the engine calls `crypto.randomUUID()` and `new Date()` internally, so assert on _values and shapes_, never on whole-state snapshots or generated ids.

### Persistence — unit + integration

jsdom provides `localStorage`, but it is **not** reset between tests. Always clear it:

```ts
beforeEach(() => window.localStorage.clear());
```

Cover the round trip (`saveGame` → `loadGame`), the index projection, deletion, and — importantly — the **corruption path**, since `loadGame` throws on a zod failure:

```ts
it('throws when the saved payload does not match the schema', () => {
  window.localStorage.setItem('monopoly.game.abc.v1', '{"version":1}');
  expect(() => loadGame('abc')).toThrow();
});
```

### Slices and thunks — integration

Thunks are where engine, storage, and store meet, so this is the highest-value layer to test. Use a **fresh store per test** (see §5 blockers) and assert on both the store _and_ what landed in localStorage:

```ts
const store = makeStore();
store.dispatch(createNewGame({ playerConfigs: [...], themeId: 'india-edition', createdAt: '2026-01-01T00:00:00.000Z' }));
expect(store.getState().game.activeGame).not.toBeNull();
expect(loadGameIndex()).toHaveLength(1);           // it actually persisted
```

### Components — unit

`components/game/` are presentational: render with props, assert output, assert callbacks fire. No store.

```ts
render(<SpaceDetailCard space={mumbai} currencySymbol="M" onClose={onClose} />);
expect(screen.getByRole('dialog', { name: 'Mumbai' })).toBeInTheDocument();
```

Cover the `null` space case and every `space.kind` branch — the icon and colour maps are `Partial<Record<...>>`, so a missing entry fails silently at runtime rather than at compile time.

### Pages — integration

Use `renderWithProviders` from `src/test/renderWithProviders.tsx`. Drive through user-facing queries (`getByRole`, `getByLabelText`), never through internal state. Assert what the user sees.

### Journeys — e2e

One spec per journey, named for the journey. Query by accessible role and name so the test doubles as an accessibility check:

```ts
await page.getByRole('button', { name: 'Create game' }).click();
await expect(page).toHaveURL(/\/game\//);
```

Reserve `data-testid` for things with no accessible handle (the board grid). Never assert on CSS classes.

---

## 3. Coding conventions

### Layer discipline

- `src/domain/` is **pure**: no React, no Redux, no `window`, no `localStorage`. This is what makes the rules testable — protect it.
- `src/components/game/` is **presentational**: props in, callbacks out, no `useAppSelector`, no `dispatch`.
- `src/features/` owns React and store access. Business rules go in the engine, never in a component or a reducer.
- Orchestration (engine call → save → dispatch) lives in thunks, not in components.

### TypeScript

- All game types live in `src/domain/types/game.ts`. Extend there; do not declare parallel local shapes.
- Narrow discriminated unions on `kind` / `type`. **Never cast** — a needed cast means the type is wrong.
- Exhaust unions with a `switch`; when adding a union member, follow the compiler to every site, then hand-check the `Partial<Record<...>>` maps it will _not_ flag.
- No `any`. `strict` is off project-wide, so this is on you, not the compiler.

### React

- Function components, hooks only.
- Use the typed `useAppDispatch` / `useAppSelector` from `src/app/hooks.ts` — never bare `useSelector`.
- Derive state during render; reach for `useMemo` only for genuinely expensive work.
- Clean up every timer, interval, listener, and audio object in a `useEffect` teardown (see `DiceDock` for the pattern).

### Redux

- Slices hold state shape and trivial setters. Thunks hold orchestration.
- Never mutate game state outside the engine. New behaviour = new `GameCommand`, not a new reducer that edits `activeGame`.
- Keep ephemeral UI state (input drafts, open panels) in `uiSlice` or local component state — not in the persisted game state.

### Accessibility

Every interactive element needs an accessible name. Board spaces, dialogs, and dice already follow this; keep it up, because the e2e suite queries by role and name and will break if you regress it.

### Styling

The active app uses one plain stylesheet, `src/app/app.css`, imported once in `App.tsx`. The `.scss` modules under `src/assets/css/` belong to the dead legacy island — do not add to them.

### Naming

`camelCase` values, `PascalCase` components and types, `SCREAMING_SNAKE` module constants. Files: `PascalCase.tsx` for components, `camelCase.ts` for everything else. Descriptive names over short ones — `activeBidderIndex`, not `idx`.

---

## 4. DRY and modularity

**Rule of two.** The second time a piece of logic appears, extract it. Do not wait for the third.

Before writing a helper, check whether the engine already has one (`updatePlayer`, `appendEvents`, `movePlayerTo`, `resolveBankPayment`, `getSpaceById`, …) — §4 of [architecture.md](architecture.md) lists them. Adding a parallel helper that does the same thing is the most common way this codebase drifts.

**Extract to the lowest layer that both callers can reach.** Shared rules → `domain/`. Shared presentation (colour maps, icon resolution, money formatting) → a shared module under `components/game/`, imported by both the board and the detail card. Never duplicate across `features/` and `components/`.

The known-duplication table in CLAUDE.md §7 is a working debt list. Touching one of those lines means extracting it and deleting the row — the table should shrink over time, never grow.

**Keep modules small and single-purpose.** `gameEngine.ts` is ~900 lines and is the main candidate for splitting (movement, rent, auction, jail, cards) once building and trading land. When you add a substantial rules area, add it as a new module rather than growing the switch file further.

---

## 5. Current state — gaps you are inheriting

The mandate above is the standard going forward. The repository does **not** meet it today. Honest baseline:

| Area                                           | Unit                 | Integration | E2E          |
| ---------------------------------------------- | -------------------- | ----------- | ------------ |
| `gameEngine` (9 implemented commands)          | 3 tests, ~2 commands | —           | —            |
| `rng` (`SeededRandomSource`, `shuffle`)        | none                 | —           | —            |
| `persistence` (save/load/index/delete/corrupt) | none                 | none        | —            |
| `gameSlice` thunks                             | —                    | none        | —            |
| `uiSlice`                                      | none                 | —           | —            |
| `HomePage`                                     | —                    | 2 tests     | partial      |
| `GamePage` (board, decision panels)            | —                    | none        | 1 smoke spec |
| `DiceDock`, `SpaceDetailCard`                  | none                 | —           | partial      |

**Two harness blockers remain before the integration mandate is fully achievable:**

1. ~~`pnpm lint` is broken~~ — **fixed.** `.eslintrc.json` now exists and `pnpm lint` passes clean. It also machine-enforces the layer boundaries (see below).
2. **`renderWithProviders` shares one singleton store** (`src/test/renderWithProviders.tsx` imports `appStore` directly). Any integration test that dispatches leaks state into the next test. Fix: export a `makeStore()` factory from `src/app/appStore.ts`, have `renderWithProviders` build a fresh store per render, and accept a `preloadedState` option.
3. **`localStorage` is never reset between tests.** Add a global `beforeEach(() => localStorage.clear())` to `src/setupTests.ts` so persistence-touching tests cannot contaminate one another.

Fixing these two is the prerequisite work for the policy in §1.
