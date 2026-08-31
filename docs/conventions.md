# Conventions

How code in this repo is named, organised, and enforced. Read with
[coding-guidelines.md](coding-guidelines.md) (testing policy) and
[architecture.md](architecture.md) (layers).

**Most of this is machine-enforced.** `pnpm lint` fails the build on a violation, so these are
rules, not suggestions. Where a rule is a warning rather than an error, it is called out below.

---

## 1. File naming

Suffix says what a file contains. One purpose per file.

| Pattern                   | Contains                                            | Example                 |
| ------------------------- | --------------------------------------------------- | ----------------------- |
| `PascalCase.tsx`          | Exactly one React component (same name as the file) | `BoardSpaceCell.tsx`    |
| `camelCase.constants.ts`  | Constants and frozen lookup tables                  | `game.constants.ts`     |
| `camelCase.enums.ts`      | Enums                                               | `game.enums.ts`         |
| `camelCase.interfaces.ts` | Exported interfaces and type aliases                | `game.interfaces.ts`    |
| `camelCase.utils.ts`      | Pure functions, no React, no state                  | `money.utils.ts`        |
| `camelCase.selectors.ts`  | Pure derivations from state                         | `gameView.selectors.ts` |
| `camelCase.ts`            | Everything else (slices, services)                  | `gameSlice.ts`          |
| `*.test.ts(x)`            | Tests, beside the file under test                   | `space.utils.test.ts`   |
| `_partial.scss`           | SCSS partial                                        | `_board.scss`           |

Folders are `kebab-case`. Enforced by `check-file/filename-naming-convention` and
`check-file/folder-naming-convention`.

**The taxonomy is enforced on contents, not just names.** `no-restricted-syntax` in
`.eslintrc.json` fails the build when:

- an **enum** is declared outside a `*.enums.ts` file;
- an **exported** interface or type alias is declared outside a `*.interfaces.ts` file.

Three exemptions, each because the shape belongs where it is:

| Exempt                                  | Why                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `<Component>Props`                      | Documented in section 5: props live beside their component                                                                                 |
| `Use*Result` / `Use*Options`            | Documented in section 5: a hook's own types live beside the hook                                                                           |
| `*.constants.ts`, `src/app/appStore.ts` | Type aliases derived from a value in the same file — `(typeof X)[keyof typeof X]`, RTK's `RootState` — cannot move without an import cycle |

A shape that is only used inside its own module does not need to move: the rule targets
`export`ed declarations. Move one out and re-export it from the original module if callers
already import it from there — see `holdings.utils.ts` and `holdings.interfaces.ts`.

> **Editing this rule:** it is defined in **exactly one** `overrides` entry on purpose. ESLint
> _replaces_ rule options per override instead of merging them, so a second entry naming
> `no-restricted-syntax` would silently disable these selectors for every file it matched. That is
> already what the three `no-restricted-imports` overrides do to the legacy-island patterns. Widen
> the existing entry's `excludedFiles`; do not add a second one.

**Exceptions**, deliberate and narrow: `src/index.tsx` and `src/App.tsx` are entry points;
`src/test/renderWithProviders.tsx` is a helper, not a component.

## 2. Naming inside files

| Thing                    | Convention                  | Notes                                                 |
| ------------------------ | --------------------------- | ----------------------------------------------------- |
| Interfaces, types, enums | `PascalCase`                | **No `I` prefix** — `PlayerState`, not `IPlayerState` |
| Enum members             | `PascalCase`                | `SpaceKind.CommunityChest`                            |
| Constants                | `UPPER_SNAKE_CASE`          | `STARTING_CASH`, `MAX_PLAYERS`                        |
| Variables, parameters    | `camelCase`                 |                                                       |
| Functions                | `camelCase`                 | Components are the `PascalCase` exception             |
| Type parameters          | `TPascalCase`               | `T` prefix required                                   |
| Booleans                 | `is` / `has` / `can` prefix | `isEnabled`, `canRollAgain`                           |
| Predicates / type guards | `is*` returning `x is T`    | `isOwnableSpace`                                      |
| Selectors                | `select*`                   | `selectActivePlayer`                                  |
| Handler props            | `on*`                       | `onSelect`, `onRoll`                                  |
| Factories                | `make*` / `create*`         | `makeTokenFinder`                                     |

Enforced by `@typescript-eslint/naming-convention`.

## 3. No hardcoded values

**Never inline a magic string or number that has meaning.**

- **Closed sets → enums** in `*.enums.ts`. `SpaceKind.Street`, never `'street'`. The compiler
  then catches typos and finds every usage on rename.
- **Ruleset numbers → constants** in `domain/constants/`. `STARTING_CASH`, never `1500`.
- **Colours → theme tokens.** `var(--accent)` in SCSS, never a hex in a component partial.
  See [theming.md](theming.md).
- **Test selectors → `TEST_IDS`** in `shared/constants/testIds.constants.ts`.
- **Copy that repeats → a constant.** One-off human prose can stay inline.

String enums serialise to their plain values, so they are safe in persisted state.

## 3b. Design system

| Decision        | Rule                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Corners**     | **Sharp everywhere.** Every radius comes from `$radius-*` in `abstracts/_tokens.scss`, and they are all `0`. Never hardcode a radius. The one exception is **physical game pieces** — a pawn, a die, and its pips are real objects, not UI surfaces (`$token-radius`, `$die-radius`, `$pip-radius`). An e2e sweep fails if anything else renders a non-zero radius. |
| **Buttons**     | Two roles, both theme tokens: `--button-primary` (blue) for the action you want taken, `--button-secondary` (neutral) for the alternative. Never style a button with `--accent` — that is the board's brand red, not a button colour.                                                                                                                               |
| **Surfaces**    | Cards and modals are white (`--surface-panel`) with a subtle border. Tinted backgrounds and accent-coloured rings make the same content look different depending on where it appears.                                                                                                                                                                               |
| **Colour**      | Only theme tokens. No hex in a component partial. See [theming.md](theming.md).                                                                                                                                                                                                                                                                                     |
| **Geometry**    | Fonts, spacing, breakpoints and board metrics are tokens in `abstracts/_tokens.scss`.                                                                                                                                                                                                                                                                               |
| **Composition** | One card component per concept, reused rather than re-styled — `SpaceCard` is the title deed, the body of the buy decision, _and_ each holding in the player drawer.                                                                                                                                                                                                |

## 3c. Styling (SCSS)

Styles live in `src/styles/`, entry `main.scss`, imported once in `App.tsx`. Layer order is
`abstracts` → `themes` → `base` → `layout` → `components` → `pages` → `utilities`; tokens and
themes come first so later partials can use them, and **`utilities/` must stay last** so its
single-class rules win over equal-specificity component rules.

- **Never hardcode a colour in a partial.** Use `var(--token)`; a literal hex silently breaks theming.
- One partial per component or page; register it in `main.scss`.
- Prefer nesting that mirrors the component's markup over long `:not()` selector chains.
- **Grid row templates must match the number of children actually rendered.** The corner-space bug
  came from a 3-row template on a 2-child element. A conditional child needs a modifier class.
- Adding a theme: [theming.md](theming.md). The `.scss` under `src/assets/css/` is the dead legacy
  island — do not add to it.

## 4. Keep logic out of components

This is what makes the code testable — a pure function needs no DOM, no store, no render.

```
domain/**/*.utils.ts        rules and predicates      pure, no React
features/**/*.selectors.ts  state -> view models      pure, no React
components/**/*.tsx         view models -> markup     no store, no derivation
features/**/*Page.tsx       wiring: select, derive, dispatch
```

A component should read as a list of elements and props. If it contains a `filter`, a `reduce`,
or a chain of conditionals deciding _what_ to show rather than _how_, that belongs in a selector
or a util.

Concretely: `GamePage` selects state and calls selectors; `gameView.selectors.ts` builds view
models; `BoardSpaceCell` renders one square. Each is independently testable.

## 4b. Utility files — what goes where

Not everything belongs in a component. Before adding a function to a `.tsx`, ask which of these
it is:

| Kind                     | Home                         | Rule                                                 |
| ------------------------ | ---------------------------- | ---------------------------------------------------- |
| Game rule or predicate   | `domain/**/*.utils.ts`       | Pure. No React, no store, no DOM.                    |
| Derivation from state    | `features/**/*.selectors.ts` | Pure. Takes state, returns a view model.             |
| Cross-cutting formatting | `shared/utils/*.utils.ts`    | Pure. Depends on nothing but domain types/constants. |
| Stateful React behaviour | `**/hooks/useThing.ts`       | See section 4c.                                      |
| Rendering                | `*.tsx`                      | Props in, elements out.                              |

A function belongs in a util file if you can describe it without saying "when the user…" or
"on screen". Being able to test it without rendering anything is the point.

Existing utils: `space.utils` (board-space guards), `boardLayout.utils` (index → grid cell),
`playerActions.utils` (what a player may do), `money.utils` (formatting),
`setupValidation.utils` (form rules), `gameView.selectors` (state → view models).

## 4c. Hooks

Use a custom hook when behaviour is **stateful or effectful and belongs to React** — state that
survives renders, subscriptions, timers, or store access. Pure logic is a util, not a hook.

**Rules**

- One hook per file, in a `hooks/` folder, named `useThing.ts` after the hook it exports.
- Name the return type `UseThingResult`, and options `UseThingOptions`.
- Return an object, not a positional tuple, once there is more than one value — call sites stay
  readable and adding a field is not a breaking change.
- **Every effect that subscribes must clean up.** Listeners, timers, intervals, and audio all get
  torn down in the returned cleanup; test the unmount case.
- Wrap returned callbacks in `useCallback` and derived objects in `useMemo` when they are passed
  as props, so children do not re-render for nothing.
- A hook that only wraps `useState` adds indirection without value — don't.
- Keep hooks out of `domain/`. That layer must stay React-free.

**Which React tool to reach for**

| Need                                | Use                                                   |
| ----------------------------------- | ----------------------------------------------------- |
| Value derived from props/state      | Compute it during render; `useMemo` only if expensive |
| Value derived from store state      | A selector in `*.selectors.ts`, called during render  |
| State that outlives a render        | `useState` in a hook, not scattered in the component  |
| Subscription, timer, or listener    | `useEffect` inside a hook, with cleanup               |
| A stable callback passed to a child | `useCallback`                                         |
| Reading the Redux store             | `useAppSelector` — never bare `useSelector`           |

**Existing hooks**

| Hook                                                                  | Owns                                                                    |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`useEscapeKey`](../src/shared/hooks/useEscapeKey.ts)                 | Escape-to-dismiss for overlays, with listener cleanup                   |
| [`useDiceRoller`](../src/components/game/hooks/useDiceRoller.ts)      | Dice animation, roll sound, timers, committing the roll                 |
| [`useActiveGame`](../src/features/game/hooks/useActiveGame.ts)        | Loading the routed game and resolving its theme                         |
| [`useGameCommands`](../src/features/game/hooks/useGameCommands.ts)    | Every command the game screen dispatches                                |
| [`useGameOverlays`](../src/features/game/hooks/useGameOverlays.ts)    | Which overlay is open: activity drawer, player details, or a space deed |
| [`useGameSetupForm`](../src/features/setup/hooks/useGameSetupForm.ts) | Setup form state; validation delegated to a util                        |

The payoff is visible in the page components: `GamePage` went from 502 lines of mixed state,
derivation, and markup to 140 lines of wiring.

## 4d. Debuggability

Failures must leave a trace. The engine throws on an invalid command, and a throw that escapes
into React's event path aborts the caller mid-flight — that is how the dice once stuck on
"Rolling…" with no error visible anywhere.

**Rules**

- **Never let an engine throw reach React.** `runGameCommand` catches, logs, and stores the
  message in `game.commandError`; the UI shows it in a `CommandErrorBanner`. A rejected command
  is a visible, dismissible message, never a dead button.
- **Log at the boundary.** Every command dispatch logs at debug with the game id, turn, phase,
  and pending decision; every rejection logs at error with the command and stack. That context is
  what makes a report reproducible.
- **Contain throws in timer and animation callbacks.** A throw escaping a `setTimeout` prevents
  React committing queued state. Catch, log, and reset — a stuck UI is worse than a logged error.
- **Derive from state, not from a redundant flag.** `pendingDecision` duplicating
  `player.inJail` let the two drift and deadlocked the game. Where a fact is already in the
  model, select from it.
- **A guard must not remove the last action.** Blocking an invalid action is only half the fix;
  check something else is still offered, or you have traded a crash for a deadlock.
- **Prefer a guard over a throw in the UI.** If the engine would reject an action, the UI should
  not offer it (`selectCanRollDice` refuses a jailed player). The catch is the safety net, not
  the design.

**The log** — [`shared/utils/logger.utils.ts`](../src/shared/utils/logger.utils.ts). Entries go to
the console, a capped in-memory ring, and `localStorage` so they survive a reload. In the browser:

```js
monopolyLog.entries(); // everything captured
monopolyLog.errors(); // failures only
monopolyLog.download(); // JSON to copy into a bug report
```

## 5. Component rules

- **One component per file**, named the same as the file.
- **Props interface beside the component**, named `<Component>Props`, not exported unless another
  file needs it.
- **Shared, exported view models go in `*.interfaces.ts`** — e.g.
  `components/game/panels/panels.interfaces.ts`. They live in the component layer because
  components may not import from `features/`, so the feature layer builds them and passes down.
- **Presentational components take props and callbacks only** — no `useAppSelector`, no
  `dispatch`. Enforced by `no-restricted-imports`.
- **Sort props alphabetically** in JSX when there is no logical grouping; it makes diffs smaller.

## 6. File and function size

| Rule                     | Limit | Level   |
| ------------------------ | ----- | ------- |
| `max-lines`              | 300   | warning |
| `max-lines-per-function` | 120   | warning |
| `max-depth`              | 4     | warning |
| `complexity`             | 12    | warning |

Warnings, not errors, because splitting is a judgement call — but a warning is a signal to split,
not to ignore. Data tables (`domain/board`, `domain/cards`) and `gameEngine.ts` are exempt; they
are long by nature and splitting the engine is tracked separately.

**The codebase currently has zero lint warnings.** Keep it that way: if a change introduces one,
split the file rather than raising the limit.

## 7. TypeScript

- **No `any`** (error). No casts — a needed cast means the type is wrong. `as never` is banned in
  spirit and should never appear.
- **Narrow discriminated unions** on `kind` / `type`; do not cast to the variant.
- **`import type`** for type-only imports (auto-fixable).
- **Prefer type guards** over inline condition chains — they narrow _and_ name the concept.
- Non-null assertions (`!`) are a warning; prefer an explicit throw with a useful message.

## 8. Enforcement

| Convention                                 | Enforced by                                                    |
| ------------------------------------------ | -------------------------------------------------------------- |
| Layer boundaries                           | `no-restricted-imports` overrides in `.eslintrc.json`          |
| File naming                                | `check-file/filename-naming-convention`                        |
| Enums / exported types in their typed file | `no-restricted-syntax` in `.eslintrc.json` (section 1)         |
| Folder naming                              | `check-file/folder-naming-convention`                          |
| Identifier naming                          | `@typescript-eslint/naming-convention`                         |
| No `any`                                   | `@typescript-eslint/no-explicit-any`                           |
| No nested ternaries                        | `no-nested-ternary`                                            |
| File/function size                         | `max-lines`, `max-lines-per-function`, `complexity` (warnings) |
| Formatting                                 | Prettier (`pnpm format`)                                       |
| Theme token discipline                     | `@error` guard in `themes/_themes.scss` at compile time        |

Run everything before reporting work done:

```bash
npx tsc --noEmit && pnpm lint && pnpm test && pnpm test:e2e
```

## 9. Adding something new — checklist

- [ ] File named per section 1, in the layer its dependencies allow
- [ ] Identifiers named per section 2
- [ ] No literal strings/numbers with meaning — enum, constant, or token (section 3)
- [ ] Logic in a `.utils.ts` / `.selectors.ts`, not in the component (section 4)
- [ ] `TEST_IDS` entry added for anything a test needs to select
- [ ] Unit + integration + e2e tests ([coding-guidelines.md](coding-guidelines.md))
- [ ] [file-index.md](file-index.md) row added
- [ ] Feature doc added or updated in [features/](features/)
