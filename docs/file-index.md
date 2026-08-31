# File Index

One line per file: what it holds, so you can find the right file without opening ten.
Grouped by layer. Legacy-island files are listed last and are **not** part of the running app.

Keep this current — adding or removing a file means editing this table in the same change
(see the Documentation contract in [CLAUDE.md](../CLAUDE.md)).

File-naming rules are in [conventions.md](conventions.md).

---

## Entry points

| File                              | What it does                                                              |
| --------------------------------- | ------------------------------------------------------------------------- |
| [src/index.tsx](../src/index.tsx) | Boots React, mounts `<App>` inside the Redux `Provider`.                  |
| [src/App.tsx](../src/App.tsx)     | Route table only: `/`, `/rules`, `/game/:gameId`. Imports the stylesheet. |
| [index.html](../index.html)       | HTML shell; loads Google Fonts via `<link>`.                              |

## `src/app/` — store wiring

| File                                  | What it does                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [appStore.ts](../src/app/appStore.ts) | `makeStore(preloadedState?)` plus the app's single `appStore`; exports `RootState`/`AppDispatch`, derived from the factory. |
| [hooks.ts](../src/app/hooks.ts)       | Typed `useAppDispatch` / `useAppSelector`. Always use these, never bare `useSelector`.                                      |

## `src/domain/` — pure game logic (no React, no Redux, no DOM)

### Types and constants

| File                                                                           | What it does                                                                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [types/game.interfaces.ts](../src/domain/types/game.interfaces.ts)             | **All game shapes.** Board spaces, players, ownership, turn state, decisions, commands.                                                          |
| [types/game.enums.ts](../src/domain/types/game.enums.ts)                       | **All closed value sets.** `SpaceKind`, `ColorGroup`, `TurnPhase`, `PendingDecisionType`, `GameCommandType`, `CardEffectKind`, `PropertyAction`. |
| [constants/game.constants.ts](../src/domain/constants/game.constants.ts)       | Ruleset numbers: starting cash, GO salary, jail fine, board size, bank inventory, history cap.                                                   |
| [constants/board.constants.ts](../src/domain/constants/board.constants.ts)     | Railway and utility prices, mortgage values, rent multipliers.                                                                                   |
| [constants/display.constants.ts](../src/domain/constants/display.constants.ts) | Amounts quoted in explanatory copy, derived from the ruleset constants.                                                                          |

### Rules

| File                                                                                 | What it does                                                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [rules/gameEngine.ts](../src/domain/rules/gameEngine.ts)                             | **The rules engine.** `createGameState` + `executeGameCommand`: turn, rent, auction, jail, and card logic.            |
| [rules/rng.ts](../src/domain/rules/rng.ts)                                           | Dice randomness: `RandomSource`, `DefaultRandomSource`, `SeededRandomSource`, `rollDie`, `shuffle`.                   |
| [rules/space.utils.ts](../src/domain/rules/space.utils.ts)                           | Board-space type guards: `isOwnableSpace`, `isStreetSpace`.                                                           |
| [rules/playerActions.utils.ts](../src/domain/rules/playerActions.utils.ts)           | Which property actions a player may take and why one is unavailable. Drives the action rail.                          |
| [rules/holdings.interfaces.ts](../src/domain/rules/holdings.interfaces.ts)           | Shapes returned by holdings.utils.                                                                                    |
| [rules/playerActions.interfaces.ts](../src/domain/rules/playerActions.interfaces.ts) | The property-action descriptor.                                                                                       |
| [rules/rng.interfaces.ts](../src/domain/rules/rng.interfaces.ts)                     | The randomness seam.                                                                                                  |
| [board/boardLayout.interfaces.ts](../src/domain/board/boardLayout.interfaces.ts)     | Board grid geometry shapes.                                                                                           |
| [rules/holdings.utils.ts](../src/domain/rules/holdings.utils.ts)                     | Net worth, mortgaged count, colour-set progress, grouped holdings, and `ownsEntireColorSet` (shared with the engine). |

### Data

| File                                                                       | What it does                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [board/indiaEditionBoard.ts](../src/domain/board/indiaEditionBoard.ts)     | The 40 board spaces with prices, rents, and colour groups.                          |
| [board/boardLayout.utils.ts](../src/domain/board/boardLayout.utils.ts)     | Maps a board index (0-39) to its cell in the 11x11 CSS grid.                        |
| [board/tokenMovement.utils.ts](../src/domain/board/tokenMovement.utils.ts) | Forward step count, whether a move is walkable, and the path it passes through.     |
| [cards/indiaEditionCards.ts](../src/domain/cards/indiaEditionCards.ts)     | Chance and Community Chest deck contents and effects.                               |
| [themes/indiaEditionTheme.ts](../src/domain/themes/indiaEditionTheme.ts)   | Game-facing theme data: name, currency symbol, token catalog. Colours live in SCSS. |
| [board/boardSide.utils.ts](../src/domain/board/boardSide.utils.ts)         | Which edge of the board a space sits on; drives which side its colour ribbon hugs.  |

### Domain tests

| File                                                                                 | Covers                                                                                   |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [rules/gameEngine.test.ts](../src/domain/rules/gameEngine.test.ts)                   | Engine defaults, buy decision, auction on decline (seeded dice).                         |
| [rules/space.utils.test.ts](../src/domain/rules/space.utils.test.ts)                 | Type guards, including board-wide title-deed counts.                                     |
| [rules/playerActions.utils.test.ts](../src/domain/rules/playerActions.utils.test.ts) | Property-action availability and disabled reasons.                                       |
| [board/boardLayout.utils.test.ts](../src/domain/board/boardLayout.utils.test.ts)     | Grid mapping: corners, uniqueness, edges, wrapping.                                      |
| [board/tokenMovement.utils.test.ts](../src/domain/board/tokenMovement.utils.test.ts) | Forward steps, GO wrapping, walkable vs teleport, path contents.                         |
| [board/boardSide.utils.test.ts](../src/domain/board/boardSide.utils.test.ts)         | Corners, per-side membership, ten spaces a side, index wrapping.                         |
| [rules/holdings.utils.test.ts](../src/domain/rules/holdings.utils.test.ts)           | Net worth with mortgages and buildings, set progress, group ordering, empty-group guard. |

## `src/features/` — pages, state, persistence (React + Redux aware)

| File                                                                                                       | What it does                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [setup/HomePage.tsx](../src/features/setup/HomePage.tsx)                                                   | New-game setup form plus the saved-game list with resume/delete.                                            |
| [setup/HomePage.test.tsx](../src/features/setup/HomePage.test.tsx)                                         | Integration tests for setup rendering and name validation.                                                  |
| [game/GamePage.tsx](../src/features/game/GamePage.tsx)                                                     | Game screen **wiring only**: selects state, derives view models, dispatches commands.                       |
| [game/GameOverlayLayer.tsx](../src/features/game/GameOverlayLayer.tsx)                                     | Everything that floats over the board: drawers, deed panel, toasts, decision modal.                         |
| [game/toastFeed.utils.ts](../src/features/game/toastFeed.utils.ts)                                         | Turns the history delta into toasts, and derives each one's tone from its wording.                          |
| [game/boardOwnership.utils.ts](../src/features/game/boardOwnership.utils.ts)                               | Builds the board's owner-marker map from ownership plus the theme token catalogue.                          |
| [game/sitePanel.utils.ts](../src/features/game/sitePanel.utils.ts)                                         | Resolves a picked space into the site panel's three ownership states.                                       |
| [game/toastFeed.utils.test.ts](../src/features/game/toastFeed.utils.test.ts)                               | Tone classification, the history delta, and the behaviour once the history cap is reached.                  |
| [game/gameView.selectors.ts](../src/features/game/gameView.selectors.ts)                                   | **Pure derivations**: game state → the view models the panels render. Where the screen's logic lives.       |
| [game/gameView.selectors.test.ts](../src/features/game/gameView.selectors.test.ts)                         | Unit tests for every selector, including each decision view model.                                          |
| [game/game.constants.ts](../src/features/game/game.constants.ts)                                           | Game-screen copy constants (board centre title and subtitle).                                               |
| [game/gameSlice.ts](../src/features/game/gameSlice.ts)                                                     | Game slice + thunks bridging UI → engine → storage (`runGameCommand`, `createNewGame`, `loadGameById`).     |
| [game/uiSlice.ts](../src/features/game/uiSlice.ts)                                                         | Ephemeral UI state not part of the saved game (auction bid input).                                          |
| [persistence/persistence.ts](../src/features/persistence/persistence.ts)                                   | localStorage read/write: save, load, delete, and the saved-game index.                                      |
| [persistence/persistence.integration.test.ts](../src/features/persistence/persistence.integration.test.ts) | Save/load round trip, and that a drawn card survives it.                                                    |
| [persistence/schema.ts](../src/features/persistence/schema.ts)                                             | Zod schemas validating anything read back out of storage.                                                   |
| [rules/RulesPage.tsx](../src/features/rules/RulesPage.tsx)                                                 | Rules booklet shell: header, section nav, and the section components.                                       |
| [rules/rulesSync.test.ts](../src/features/rules/rulesSync.test.ts)                                         | Enforces that the booklet and docs/india-edition-rules.md cover the same topics and quote the same numbers. |
| [rules/RulesPage.test.tsx](../src/features/rules/RulesPage.test.tsx)                                       | Integration tests: every nav link resolves to a rendered section.                                           |
| [game/GameUnavailable.tsx](../src/features/game/GameUnavailable.tsx)                                       | Shown when the routed game is missing or fails schema validation.                                           |
| [game/hooks/useActiveGame.ts](../src/features/game/hooks/useActiveGame.ts)                                 | Loads the routed game and resolves its theme and currency symbol.                                           |
| [game/hooks/useGameCommands.ts](../src/features/game/hooks/useGameCommands.ts)                             | Binds every command the game screen dispatches.                                                             |
| [setup/hooks/useGameSetupForm.ts](../src/features/setup/hooks/useGameSetupForm.ts)                         | Setup form state; delegates the rules to setupValidation.utils.                                             |
| [setup/setup.interfaces.ts](../src/features/setup/setup.interfaces.ts)                                     | The game-setup form draft shape.                                                                            |
| [setup/setupValidation.utils.ts](../src/features/setup/setupValidation.utils.ts)                           | Pure setup validation: non-empty, unique names, unique tokens.                                              |
| [setup/setupValidation.utils.test.ts](../src/features/setup/setupValidation.utils.test.ts)                 | Unit tests for every validation rule and its precedence.                                                    |
| [setup/setup.constants.ts](../src/features/setup/setup.constants.ts)                                       | Setup form defaults and error messages.                                                                     |
| [game/hooks/useGameOverlays.ts](../src/features/game/hooks/useGameOverlays.ts)                             | Which overlay is open: activity drawer, player details, or a space deed.                                    |

## `src/components/game/` — presentational (props in, callbacks out, no store)

| File                                                                          | What it does                                                                                                                                                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DiceDock.tsx](../src/components/game/DiceDock.tsx)                           | Fixed dice roller: tumble animation, roll sound, fires `onRoll` when the animation ends.                                                                                                      |
| [diceDock.constants.ts](../src/components/game/diceDock.constants.ts)         | Dice animation timing and volume.                                                                                                                                                             |
| [SpaceDetailCard.tsx](../src/components/game/SpaceDetailCard.tsx)             | Title-deed modal: rent schedule, prices, per-kind copy. Closes on backdrop click or Escape.                                                                                                   |
| [SpaceDetailCard.test.tsx](../src/components/game/SpaceDetailCard.test.tsx)   | Per-kind rendering, themed colour-group class, close on button/Escape/backdrop.                                                                                                               |
| [spaceIcons.constants.ts](../src/components/game/spaceIcons.constants.ts)     | Icon lookup for board spaces, shared by the board cell and the title deed.                                                                                                                    |
| [deed/SpaceCard.tsx](../src/components/game/deed/SpaceCard.tsx)               | The site card: colour strip, title, icon, per-kind deed body, and optional actions. Supplies its own fixed-size surface; shared by the deed modal, the buy decision, and the holdings drawer. |
| [deed/SpaceCard.test.tsx](../src/components/game/deed/SpaceCard.test.tsx)     | The card shell class, the colour strip and its per-kind colour, the deed label, and optional actions.                                                                                         |
| [deed/StreetDeed.tsx](../src/components/game/deed/StreetDeed.tsx)             | Title-deed body for a street: site values and full rent schedule (the colour strip belongs to SpaceCard).                                                                                     |
| [deed/RailwayDeed.tsx](../src/components/game/deed/RailwayDeed.tsx)           | Title-deed body for a railway: rent by stations owned.                                                                                                                                        |
| [deed/UtilityDeed.tsx](../src/components/game/deed/UtilityDeed.tsx)           | Title-deed body for a utility: dice-multiplier rents.                                                                                                                                         |
| [deed/DeedPrimaryStats.tsx](../src/components/game/deed/DeedPrimaryStats.tsx) | Site value and mortgage value, shared by all three deed bodies.                                                                                                                               |
| [deed/SpaceDescription.tsx](../src/components/game/deed/SpaceDescription.tsx) | Explanatory copy for spaces with no rent table (GO, tax, jail, decks).                                                                                                                        |

### Board

| File                                                                          | What it does                                                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [board/BoardGrid.tsx](../src/components/game/board/BoardGrid.tsx)             | The 11x11 board: centre plus all 40 space cells.                                       |
| [board/BoardSpaceCell.tsx](../src/components/game/board/BoardSpaceCell.tsx)   | One square: colour bar (streets only), icon, name, player tokens.                      |
| [board/BoardCenter.tsx](../src/components/game/board/BoardCenter.tsx)         | Decorative centre: deck markers and logo ribbon.                                       |
| [board/BoardTokenLayer.tsx](../src/components/game/board/BoardTokenLayer.tsx) | Player tokens drawn over the board, placed by grid cell so they cannot resize a space. |

### Panels

| File                                                                                                                    | What it does                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [panels/ActionRail.tsx](../src/components/game/panels/ActionRail.tsx)                                                   | Left rail of property actions (Build/Sell/Mortgage/Redeem).                                                                             |
| [panels/CommandErrorBanner.tsx](../src/components/game/panels/CommandErrorBanner.tsx)                                   | Shows a command the engine rejected, instead of failing silently.                                                                       |
| [panels/PlayersPanel.tsx](../src/components/game/panels/PlayersPanel.tsx)                                               | Player cards: cash, property count, position, jail status.                                                                              |
| [panels/HintsPanel.tsx](../src/components/game/panels/HintsPanel.tsx)                                                   | Surfaces engine `uiHints` (the "not implemented yet" notices).                                                                          |
| [panels/panels.interfaces.ts](../src/components/game/panels/panels.interfaces.ts)                                       | Shared panel view models and decision handler types.                                                                                    |
| [panels/decisions/DecisionPanel.tsx](../src/components/game/panels/decisions/DecisionPanel.tsx)                         | Picks the right decision UI for the pending decision.                                                                                   |
| [panels/decisions/BuyOrAuctionDecision.tsx](../src/components/game/panels/decisions/BuyOrAuctionDecision.tsx)           | Buy-or-auction prompt on landing unowned.                                                                                               |
| [panels/decisions/BuyOrAuctionDecision.test.tsx](../src/components/game/panels/decisions/BuyOrAuctionDecision.test.tsx) | Deed rendering per space kind, price on the button, and the callbacks.                                                                  |
| [panels/decisions/AuctionDecision.tsx](../src/components/game/panels/decisions/AuctionDecision.tsx)                     | Auction bidding controls.                                                                                                               |
| [panels/decisions/JailDecision.tsx](../src/components/game/panels/decisions/JailDecision.tsx)                           | Jail exit choices.                                                                                                                      |
| [panels/decisions/LiquidationDecision.tsx](../src/components/game/panels/decisions/LiquidationDecision.tsx)             | Asset-liquidation notice.                                                                                                               |
| [hooks/useDiceRoller.ts](../src/components/game/hooks/useDiceRoller.ts)                                                 | Dice animation state: tumbling faces, roll sound, timers, committing the roll.                                                          |
| [hooks/useDiceRoller.test.ts](../src/components/game/hooks/useDiceRoller.test.ts)                                       | Roll lifecycle, and that a throwing handler never strands the dock.                                                                     |
| [hooks/useAnimatedTokenPositions.ts](../src/components/game/hooks/useAnimatedTokenPositions.ts)                         | Walks tokens one space at a time with a tick per step; snaps teleports.                                                                 |
| [hooks/useAnimatedTokenPositions.test.ts](../src/components/game/hooks/useAnimatedTokenPositions.test.ts)               | Step-by-step walk, wrapping past GO, per-step tick, teleport snap.                                                                      |
| [panels/TurnControls.tsx](../src/components/game/panels/TurnControls.tsx)                                               | Bottom-right cluster: end-turn button plus the dice, level with the board.                                                              |
| [panels/PlayersPanel.test.tsx](../src/components/game/panels/PlayersPanel.test.tsx)                                     | Stack collapse/expand, click target, token colours, full-table support.                                                                 |
| [overlays/DecisionModal.tsx](../src/components/game/overlays/DecisionModal.tsx)                                         | Blocking centre modal for a pending decision. Deliberately not dismissible.                                                             |
| [overlays/SideDrawer.tsx](../src/components/game/overlays/SideDrawer.tsx)                                               | Right-hand drawer shell: backdrop, header, Escape to close.                                                                             |
| [overlays/ActivityDrawer.tsx](../src/components/game/overlays/ActivityDrawer.tsx)                                       | Game event log, opened from the floating activity button.                                                                               |
| [overlays/ActivityButton.tsx](../src/components/game/overlays/ActivityButton.tsx)                                       | Floating control that opens the activity drawer.                                                                                        |
| [overlays/PlayerDetailDrawer.tsx](../src/components/game/overlays/PlayerDetailDrawer.tsx)                               | A player's stats and holdings, opened by clicking their card.                                                                           |
| [overlays/PlayerDetailDrawer.test.tsx](../src/components/game/overlays/PlayerDetailDrawer.test.tsx)                     | Stack order and contents, the shared card shell, promoting a holding without removing it from the deck, empty state, no board position. |
| [overlays/ToastStack.tsx](../src/components/game/overlays/ToastStack.tsx)                                               | Action feedback, stacked above every overlay, each row dismissing itself on a timer.                                                    |
| [overlays/overlays.interfaces.ts](../src/components/game/overlays/overlays.interfaces.ts)                               | Shared overlay shapes: the toast, and the site panel's view model.                                                                      |
| [board/board.interfaces.ts](../src/components/game/board/board.interfaces.ts)                                           | Shared board shapes: the owner marker and animated token positions.                                                                     |
| [panels/decisions/CardDrawDecision.tsx](../src/components/game/panels/decisions/CardDrawDecision.tsx)                   | The drawn Chance / Community Chest card, shown before its effect is applied.                                                            |
| [panels/decisions/CardDrawDecision.test.tsx](../src/components/game/panels/decisions/CardDrawDecision.test.tsx)         | Card copy, who drew it, and that OK is the only control.                                                                                |
| [overlays/HoldingsStack.tsx](../src/components/game/overlays/HoldingsStack.tsx)                                         | Collapsed holdings as one overlapping stack, colour-grouped: the same fixed-size `SpaceCard`, clipped to a title-only peek.             |
| [panels/PlayerBadges.tsx](../src/components/game/panels/PlayerBadges.tsx)                                               | Status badges on a player card: jail card held, jail progress, bankruptcy.                                                              |
| [panels/PlayerBadges.test.tsx](../src/components/game/panels/PlayerBadges.test.tsx)                                     | Unit tests for every badge and the empty case.                                                                                          |
| [panels/PlayerCard.tsx](../src/components/game/panels/PlayerCard.tsx)                                                   | One player at a glance: net worth, cash, sites, colour-set pips, status badges.                                                         |
| [panels/PlayerCard.test.tsx](../src/components/game/panels/PlayerCard.test.tsx)                                         | Net worth headline, conditional mortgaged count, pips per group, complete-set state.                                                    |
| [panels/ColorGroupPips.tsx](../src/components/game/panels/ColorGroupPips.tsx)                                           | Colour-set progress swatches shown on a player card.                                                                                    |

## `src/components/setup/` — presentational setup components

| File                                                               | What it does                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| [SetupHero.tsx](../src/components/setup/SetupHero.tsx)             | Intro card: what the app is and the locked v1 scope.      |
| [PlayerConfigRow.tsx](../src/components/setup/PlayerConfigRow.tsx) | One player's name and token inputs.                       |
| [RecentGamesList.tsx](../src/components/setup/RecentGamesList.tsx) | Saved games with continue and delete, or the empty state. |

## `src/components/rules/` — rules booklet sections

Static prose, one component per booklet section, composed by `RulesPage`.

| File                         | What it does                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `RulesIntro.tsx`             | A short history of Monopoly and this edition.                                                          |
| `RulesFaq.tsx`               | The questions asked mid-game, mirroring the doc's Quick answers.                                       |
| `rulesSections.constants.ts` | The booklet's sections: one list behind the nav, the rendered sections, and the matching doc headings. |
| `RulesStart.tsx`             | Setting up before the first roll.                                                                      |
| `RulesTurn.tsx`              | What happens on a turn.                                                                                |
| `RulesBoard.tsx`             | Space-by-space board reference.                                                                        |
| `RulesBoardExtra.tsx`        | Buying and the forced auction.                                                                         |
| `RulesJail.tsx`              | Going to and leaving Jail.                                                                             |
| `RulesBuildings.tsx`         | Houses and hotels.                                                                                     |
| `RulesMoney.tsx`             | Money, rent, and mortgages.                                                                            |
| `RulesSpeedDie.tsx`          | Speed Die, deferred in this ruleset.                                                                   |
| `RulesClosing.tsx`           | Closing notes.                                                                                         |

## `src/shared/` — cross-cutting helpers

| File                                                                           | What it does                                                                            |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [constants/testIds.constants.ts](../src/shared/constants/testIds.constants.ts) | Every `data-testid`, plus `scopedTestId` for repeated elements. Tests import from here. |
| [utils/logger.enums.ts](../src/shared/utils/logger.enums.ts)                   | Log severity levels.                                                                    |
| [utils/logger.interfaces.ts](../src/shared/utils/logger.interfaces.ts)         | One captured log entry.                                                                 |
| [utils/logger.utils.ts](../src/shared/utils/logger.utils.ts)                   | App log: console + capped ring + localStorage, exposed as `window.monopolyLog`.         |
| [utils/logger.utils.test.ts](../src/shared/utils/logger.utils.test.ts)         | Ring cap, persistence, error filtering, storage-failure safety.                         |
| [utils/money.utils.ts](../src/shared/utils/money.utils.ts)                     | `formatMoney` and currency-symbol fallback. The one place money is rendered.            |
| [utils/money.utils.test.ts](../src/shared/utils/money.utils.test.ts)           | Unit tests for money formatting.                                                        |
| [hooks/useEscapeKey.ts](../src/shared/hooks/useEscapeKey.ts)                   | Escape-to-dismiss for overlays, with listener cleanup.                                  |
| [hooks/useEscapeKey.test.ts](../src/shared/hooks/useEscapeKey.test.ts)         | Unit tests, including that the listener is removed on unmount.                          |

## `src/styles/` — SCSS

| File                                                                          | What it does                                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [main.scss](../src/styles/main.scss)                                          | Entry point. Imports every layer in order; the only stylesheet App.tsx imports.              |
| [themes/\_themes.scss](../src/styles/themes/_themes.scss)                     | **The theme engine.** Token maps, contract guard, `[data-theme]` emission.                   |
| [utilities/\_color-groups.scss](../src/styles/utilities/_color-groups.scss)   | Generated `.group-*` classes. **Must stay last in main.scss** so utilities win the cascade.  |
| [abstracts/\_tokens.scss](../src/styles/abstracts/_tokens.scss)               | Non-themeable tokens: fonts, radii, spacing, breakpoints, board geometry, colour-group list. |
| [abstracts/\_mixins.scss](../src/styles/abstracts/_mixins.scss)               | Shared mixins: `below()`, `mono-label()`, `card-surface()`.                                  |
| [base/\_reset.scss](../src/styles/base/_reset.scss)                           | Box-sizing, body, default control resets.                                                    |
| [base/\_typography.scss](../src/styles/base/_typography.scss)                 | Headings, `.eyebrow`, helper and error text.                                                 |
| [layout/\_shell.scss](../src/styles/layout/_shell.scss)                       | `.app-shell`, `.page`, shared grid/flex helpers.                                             |
| [components/\_board.scss](../src/styles/components/_board.scss)               | Board grid, centre ribbon, deck markers, and **space row templates**.                        |
| [components/\_action-rail.scss](../src/styles/components/_action-rail.scss)   | Property-action rail buttons and their responsive collapse.                                  |
| [components/\_buttons.scss](../src/styles/components/_buttons.scss)           | Primary / secondary / danger buttons.                                                        |
| [components/\_forms.scss](../src/styles/components/_forms.scss)               | Inputs, selects, labels, setup form grids.                                                   |
| [components/\_panels.scss](../src/styles/components/_panels.scss)             | Panel/hero/summary/decision surfaces, headings, badges, empty states.                        |
| [components/\_dice.scss](../src/styles/components/_dice.scss)                 | Dice dock, die faces, pip grid positions, tumble keyframes.                                  |
| [components/\_space-detail.scss](../src/styles/components/_space-detail.scss) | Title-deed modal: backdrop, card, colour band, rent table.                                   |
| [components/\_player.scss](../src/styles/components/_player.scss)             | Player cards, metrics, owned-property cards.                                                 |
| [pages/\_game.scss](../src/styles/pages/_game.scss)                           | Three-column game layout, turn panel, activity list, responsive rules.                       |
| [pages/\_home.scss](../src/styles/pages/_home.scss)                           | Recent-games list styling.                                                                   |
| [pages/\_rules.scss](../src/styles/pages/_rules.scss)                         | Rules booklet typography and tables.                                                         |

## Test infrastructure

| File                                                                              | What it does                                                                                                      |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [src/test/renderWithProviders.tsx](../src/test/renderWithProviders.tsx)           | RTL helper: a component in a **fresh** Redux store + `MemoryRouter`; returns the store, accepts `preloadedState`. |
| [src/test/renderWithProviders.test.tsx](../src/test/renderWithProviders.test.tsx) | Proves each render gets its own store and that `preloadedState` reaches a selector.                               |
| [src/setupTests.ts](../src/setupTests.ts)                                         | Vitest setup; jest-dom matchers and a `localStorage` reset before each test.                                      |
| [src/setupTests.test.ts](../src/setupTests.test.ts)                               | Proves the storage reset actually runs between tests.                                                             |
| [tests/e2e/helpers.ts](../tests/e2e/helpers.ts)                                   | Shared `startGame` / `advanceGame` helpers and corner reference data.                                             |
| [tests/e2e/setup.spec.ts](../tests/e2e/setup.spec.ts)                             | Creating a game and landing on a resumable route.                                                                 |
| [tests/e2e/board.spec.ts](../tests/e2e/board.spec.ts)                             | Corner geometry, title deed, ribbon placement, dividers, outlines, theming.                                       |
| [tests/e2e/layout.spec.ts](../tests/e2e/layout.spec.ts)                           | Three-column layout, action rail, dice placement, player stack.                                                   |
| [tests/e2e/overlays.spec.ts](../tests/e2e/overlays.spec.ts)                       | Decision modal, activity drawer, player detail drawer, dice roll.                                                 |
| [tests/e2e/full-table.spec.ts](../tests/e2e/full-table.spec.ts)                   | Eight-player layout: token cluster stays on the board, dice stay reachable.                                       |
| [tests/e2e/rules.spec.ts](../tests/e2e/rules.spec.ts)                             | Booklet nav resolves, the FAQ answers, and amounts render in ₹.                                                   |
| [tests/e2e/feedback.spec.ts](../tests/e2e/feedback.spec.ts)                       | Toasts, the drawn-card modal, owner marks, the three site-panel states, ₹.                                        |

## Config

| File                                            | What it does                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [vite.config.mjs](../vite.config.mjs)           | Vite build/dev config **and** the Vitest config (jsdom, globals, setup file).             |
| [project.json](../project.json)                 | NX targets wrapping Vite: serve, build, test, lint, preview.                              |
| [nx.json](../nx.json)                           | NX workspace config: caching, target defaults.                                            |
| [tsconfig.json](../tsconfig.json)               | TypeScript config. `strict: false` (gradual migration); path aliases declared but unused. |
| [.eslintrc.json](../.eslintrc.json)             | Lint rules: layer boundaries, naming conventions, file naming, size limits.               |
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
