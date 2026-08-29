# File Index

One line per file: what it holds, so you can find the right file without opening ten.
Grouped by layer. Legacy-island files are listed last and are **not** part of the running app.

Keep this current — adding or removing a file means editing this table in the same change
(see the Documentation contract in [CLAUDE.md](../CLAUDE.md)).

---

## Entry points

| File                              | What it does                                                              |
| --------------------------------- | ------------------------------------------------------------------------- |
| [src/index.tsx](../src/index.tsx) | Boots React, mounts `<App>` inside the Redux `Provider`.                  |
| [src/App.tsx](../src/App.tsx)     | Route table only: `/`, `/rules`, `/game/:gameId`. Imports the stylesheet. |
| [index.html](../index.html)       | HTML shell; loads Google Fonts via `<link>`.                              |

## `src/app/` — store wiring

| File                                  | What it does                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| [appStore.ts](../src/app/appStore.ts) | Builds the Redux store (`game` + `ui` reducers); exports `RootState`/`AppDispatch`.    |
| [hooks.ts](../src/app/hooks.ts)       | Typed `useAppDispatch` / `useAppSelector`. Always use these, never bare `useSelector`. |

## `src/domain/` — pure game logic (no React, no Redux, no DOM)

| File                                                                     | What it does                                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [types/game.ts](../src/domain/types/game.ts)                             | **All game types.** Board spaces, players, ownership, turn state, decisions, commands. Single source of truth.        |
| [rules/gameEngine.ts](../src/domain/rules/gameEngine.ts)                 | **The rules engine.** `createGameState` + `executeGameCommand`. All turn, rent, auction, jail, and card logic.        |
| [rules/rng.ts](../src/domain/rules/rng.ts)                               | Dice randomness: `RandomSource` interface, `DefaultRandomSource`, `SeededRandomSource` (tests), `rollDie`, `shuffle`. |
| [board/indiaEditionBoard.ts](../src/domain/board/indiaEditionBoard.ts)   | The 40 board spaces with prices, rents, and colour groups.                                                            |
| [cards/indiaEditionCards.ts](../src/domain/cards/indiaEditionCards.ts)   | Chance and Community Chest deck contents and their effects.                                                           |
| [themes/indiaEditionTheme.ts](../src/domain/themes/indiaEditionTheme.ts) | Game-facing theme data: name, currency symbol, player token catalog. Colours live in SCSS.                            |
| [rules/gameEngine.test.ts](../src/domain/rules/gameEngine.test.ts)       | Unit tests for the engine, using a seeded dice source.                                                                |

## `src/features/` — pages, state, persistence (React + Redux aware)

| File                                                                     | What it does                                                                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [setup/HomePage.tsx](../src/features/setup/HomePage.tsx)                 | New-game setup form (names, tokens, theme) plus the saved-game list with resume/delete.                              |
| [setup/HomePage.test.tsx](../src/features/setup/HomePage.test.tsx)       | Integration tests for setup rendering and name validation.                                                           |
| [game/GamePage.tsx](../src/features/game/GamePage.tsx)                   | The game screen: board grid, decision panels, player/holdings/activity panels.                                       |
| [game/gameSlice.ts](../src/features/game/gameSlice.ts)                   | Game state slice + the thunks that bridge UI → engine → storage (`runGameCommand`, `createNewGame`, `loadGameById`). |
| [game/uiSlice.ts](../src/features/game/uiSlice.ts)                       | Ephemeral UI state that isn't part of the saved game (currently the auction bid input).                              |
| [persistence/persistence.ts](../src/features/persistence/persistence.ts) | localStorage read/write: save, load, delete, and the saved-game index.                                               |
| [persistence/schema.ts](../src/features/persistence/schema.ts)           | Zod schemas validating anything read back out of storage.                                                            |
| [rules/RulesPage.tsx](../src/features/rules/RulesPage.tsx)               | Static rules booklet page.                                                                                           |

## `src/components/game/` — presentational (props in, callbacks out, no store)

| File                                                              | What it does                                                                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [DiceDock.tsx](../src/components/game/DiceDock.tsx)               | Fixed dice roller: tumble animation, roll sound, fires `onRoll` when the animation ends.                        |
| [SpaceDetailCard.tsx](../src/components/game/SpaceDetailCard.tsx) | Title-deed modal for a clicked space: rent schedule, prices, per-kind copy. Closes on backdrop click or Escape. |

## `src/styles/` — SCSS

| File                                                                          | What it does                                                                                                                      |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [main.scss](../src/styles/main.scss)                                          | Entry point. Imports every layer in order; the only stylesheet App.tsx imports.                                                   |
| [themes/\_themes.scss](../src/styles/themes/_themes.scss)                     | **The theme engine.** Theme token maps, the contract guard, `[data-theme]` emission, and the generated `.group-*` colour classes. |
| [abstracts/\_tokens.scss](../src/styles/abstracts/_tokens.scss)               | Non-themeable tokens: fonts, radii, spacing, breakpoints, board geometry, colour-group list.                                      |
| [abstracts/\_mixins.scss](../src/styles/abstracts/_mixins.scss)               | Shared mixins: `below()` breakpoints, `mono-label()`, `card-surface()`.                                                           |
| [base/\_reset.scss](../src/styles/base/_reset.scss)                           | Box-sizing, body, and default control resets.                                                                                     |
| [base/\_typography.scss](../src/styles/base/_typography.scss)                 | Headings, `.eyebrow`, helper and error text.                                                                                      |
| [layout/\_shell.scss](../src/styles/layout/_shell.scss)                       | `.app-shell`, `.page`, and the shared grid/flex layout helpers.                                                                   |
| [components/\_board.scss](../src/styles/components/_board.scss)               | Board grid, centre ribbon, deck markers, and **board space row templates** (streets get a colour bar, everything else does not).  |
| [components/\_buttons.scss](../src/styles/components/_buttons.scss)           | Primary / secondary / danger buttons.                                                                                             |
| [components/\_forms.scss](../src/styles/components/_forms.scss)               | Inputs, selects, labels, and the setup form grids.                                                                                |
| [components/\_panels.scss](../src/styles/components/_panels.scss)             | Panel/hero/summary/decision card surfaces, headings, badges, empty states.                                                        |
| [components/\_dice.scss](../src/styles/components/_dice.scss)                 | Dice dock, die faces, pip grid positions, tumble keyframes.                                                                       |
| [components/\_space-detail.scss](../src/styles/components/_space-detail.scss) | Title-deed modal: backdrop, card, colour band, rent table.                                                                        |
| [components/\_player.scss](../src/styles/components/_player.scss)             | Player cards, metrics, and owned-property cards.                                                                                  |
| [pages/\_game.scss](../src/styles/pages/_game.scss)                           | Game screen layout: board/side split, turn panel, activity list, responsive rules.                                                |
| [pages/\_home.scss](../src/styles/pages/_home.scss)                           | Recent-games list styling.                                                                                                        |
| [pages/\_rules.scss](../src/styles/pages/_rules.scss)                         | Rules booklet typography and tables.                                                                                              |

## Test infrastructure

| File                                                                    | What it does                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [src/test/renderWithProviders.tsx](../src/test/renderWithProviders.tsx) | RTL helper wrapping a component in the Redux `Provider` + `MemoryRouter`.        |
| [src/setupTests.ts](../src/setupTests.ts)                               | Vitest setup; loads jest-dom matchers.                                           |
| [tests/e2e/app.spec.ts](../tests/e2e/app.spec.ts)                       | Playwright smoke journey: create a game, land on the board, open a space detail. |

## Config

| File                                            | What it does                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [vite.config.mjs](../vite.config.mjs)           | Vite build/dev config **and** the Vitest config (jsdom, globals, setup file).             |
| [project.json](../project.json)                 | NX targets wrapping Vite: serve, build, test, lint, preview.                              |
| [nx.json](../nx.json)                           | NX workspace config: caching, target defaults.                                            |
| [tsconfig.json](../tsconfig.json)               | TypeScript config. `strict: false` (gradual migration); path aliases declared but unused. |
| [.eslintrc.json](../.eslintrc.json)             | ESLint rules, including the import bans that enforce layer boundaries.                    |
| [.prettierrc.json](../.prettierrc.json)         | Prettier formatting options.                                                              |
| [playwright.config.ts](../playwright.config.ts) | E2E config; auto-starts the dev server on :3000.                                          |
| [.claude/launch.json](../.claude/launch.json)   | Dev-server definition used by the in-editor browser preview.                              |

## Other

| File                                                        | What it does                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| [src/reportWebVitals.ts](../src/reportWebVitals.ts)         | Optional web-vitals reporting hook. Not currently called.  |
| [src/types/assets.d.ts](../src/types/assets.d.ts)           | Module declarations for importing images, audio, and JSON. |
| [src/types/css-modules.d.ts](../src/types/css-modules.d.ts) | Module declarations for CSS/SCSS module imports.           |

---

## Legacy island — NOT part of the running app

Unreachable from `App.tsx`; kept only as history. ESLint bans importing from these paths and
skips linting them. Do not add to or "fix" them. See [CLAUDE.md](../CLAUDE.md) section 2.

| Path                                                | What it was                                                                                           |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/redux/`                                        | Old hand-rolled actions/reducers (player, dice, board, site, modal, card, action).                    |
| `src/utility/`                                      | Old game logic helpers (`playerUtility`, `boardUtility`, `siteUtility`, `cardUtilities`, `player/*`). |
| `src/components/monopoly/`                          | Old game UI (Board, Row, Card, Dice, Modals, Player containers, Actions).                             |
| `src/components/home/`, `src/components/not_found/` | Old marketing/home and 404 components.                                                                |
| `src/assets/css/`                                   | SCSS modules for the old UI.                                                                          |
| `src/assets/data/`                                  | Zelda-era `boardData.json`, `chanceData.json`, `chestData.json`.                                      |
