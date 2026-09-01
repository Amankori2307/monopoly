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
| [types/decisions.interfaces.ts](../src/domain/types/decisions.interfaces.ts)   | Every PendingDecision shape, split out when game.interfaces.ts outgrew its line limit.                                                           |
| [types/game.enums.ts](../src/domain/types/game.enums.ts)                       | **All closed value sets.** `SpaceKind`, `ColorGroup`, `TurnPhase`, `PendingDecisionType`, `GameCommandType`, `CardEffectKind`, `PropertyAction`. |
| [constants/game.constants.ts](../src/domain/constants/game.constants.ts)       | Ruleset numbers: starting cash, GO salary, jail fine, board size, bank inventory, history cap.                                                   |
| [constants/board.constants.ts](../src/domain/constants/board.constants.ts)     | Railway and utility prices, mortgage values, rent multipliers.                                                                                   |
| [constants/display.constants.ts](../src/domain/constants/display.constants.ts) | Amounts quoted in explanatory copy, derived from the ruleset constants.                                                                          |

### Rules

| File                                                                                                     | What it does                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [rules/gameEngine.ts](../src/domain/rules/gameEngine.ts)                                                 | **The rules engine.** `createGameState` + `executeGameCommand`: turn, rent, auction, jail, and card logic.            |
| [rules/engine/state.utils.ts](../src/domain/rules/engine/state.utils.ts)                                 | State plumbing every other engine module is built from; depends on none of them.                                      |
| [rules/engine/money.utils.ts](../src/domain/rules/engine/money.utils.ts)                                 | The three money choke points, the debt queue, and redemption cost.                                                    |
| [rules/engine/rent.utils.ts](../src/domain/rules/engine/rent.utils.ts)                                   | What is owed for landing on a street, a railway or a utility.                                                         |
| [rules/engine/movement.utils.ts](../src/domain/rules/engine/movement.utils.ts)                           | Moving a token, and settling whatever it landed on.                                                                   |
| [rules/engine/cards.utils.ts](../src/domain/rules/engine/cards.utils.ts)                                 | Drawing a card, and returning a used jail card to its deck.                                                           |
| [rules/engine/turn.utils.ts](../src/domain/rules/engine/turn.utils.ts)                                   | Whose turn it is, resuming after a decision, and the win check.                                                       |
| [rules/engine/auction.utils.ts](../src/domain/rules/engine/auction.utils.ts)                             | The auction loop and the queue of properties behind it.                                                               |
| [rules/auctionBids.utils.ts](../src/domain/rules/auctionBids.utils.ts)                                   | What makes a bid legal, stated once: the engine throws from it, the panel disables from it.                           |
| [rules/auctionBids.utils.test.ts](../src/domain/rules/auctionBids.utils.test.ts)                         | The minimum bid, every refusal reason, and the ledger append.                                                         |
| [rules/engine/tradeSettlement.utils.ts](../src/domain/rules/engine/tradeSettlement.utils.ts)             | Carrying out a trade both players agreed to.                                                                          |
| [rules/engine/commands/command.interfaces.ts](../src/domain/rules/engine/commands/command.interfaces.ts) | CommandHandlers: one handler per command, each with its command narrowed.                                             |
| [rules/engine/commands/turn.commands.ts](../src/domain/rules/engine/commands/turn.commands.ts)           | rollTurnDice and endTurn.                                                                                             |
| [rules/engine/commands/jail.commands.ts](../src/domain/rules/engine/commands/jail.commands.ts)           | The three ways out of Jail and the forced fourth.                                                                     |
| [rules/engine/commands/property.commands.ts](../src/domain/rules/engine/commands/property.commands.ts)   | Buy, decline, mortgage, redeem.                                                                                       |
| [rules/engine/commands/auction.commands.ts](../src/domain/rules/engine/commands/auction.commands.ts)     | Bidding and passing.                                                                                                  |
| [rules/engine/commands/card.commands.ts](../src/domain/rules/engine/commands/card.commands.ts)           | Acknowledging a card, and applying what it says.                                                                      |
| [rules/engine/commands/debt.commands.ts](../src/domain/rules/engine/commands/debt.commands.ts)           | Settling a debt, and going bankrupt.                                                                                  |
| [rules/engine/commands/building.commands.ts](../src/domain/rules/engine/commands/building.commands.ts)   | Build, sell, and place a building won at auction.                                                                     |
| [rules/engine/commands/speedDie.commands.ts](../src/domain/rules/engine/commands/speedDie.commands.ts)   | The Bus and the move-anywhere triple.                                                                                 |
| [rules/engine/commands/trade.commands.ts](../src/domain/rules/engine/commands/trade.commands.ts)         | Propose, accept, reject.                                                                                              |
| [rules/rng.ts](../src/domain/rules/rng.ts)                                                               | Dice randomness: `RandomSource`, `DefaultRandomSource`, `SeededRandomSource`, `rollDie`, `shuffle`.                   |
| [rules/rng.test.ts](../src/domain/rules/rng.test.ts)                                                     | Determinism per seed, range bounds, and that shuffle keeps every value.                                               |
| [rules/space.utils.ts](../src/domain/rules/space.utils.ts)                                               | Board-space type guards: `isOwnableSpace`, `isStreetSpace`.                                                           |
| [rules/playerActions.utils.ts](../src/domain/rules/playerActions.utils.ts)                               | Which property actions a player may take and why one is unavailable. Drives the site panel.                           |
| [rules/holdings.interfaces.ts](../src/domain/rules/holdings.interfaces.ts)                               | Shapes returned by holdings.utils.                                                                                    |
| [rules/playerActions.interfaces.ts](../src/domain/rules/playerActions.interfaces.ts)                     | The property-action descriptor.                                                                                       |
| [rules/rng.interfaces.ts](../src/domain/rules/rng.interfaces.ts)                                         | The randomness seam.                                                                                                  |
| [board/boardLayout.interfaces.ts](../src/domain/board/boardLayout.interfaces.ts)                         | Board grid geometry shapes.                                                                                           |
| [rules/holdings.utils.ts](../src/domain/rules/holdings.utils.ts)                                         | Net worth, mortgaged count, colour-set progress, grouped holdings, and `ownsEntireColorSet` (shared with the engine). |
| [rules/buildings.utils.ts](../src/domain/rules/buildings.utils.ts)                                       | Both even rules, bank inventory checks, and what a player could raise by selling buildings.                           |
| [rules/buildings.interfaces.ts](../src/domain/rules/buildings.interfaces.ts)                             | SellableBuilding: one building a player could sell, and what it pays.                                                 |
| [rules/trade.utils.ts](../src/domain/rules/trade.utils.ts)                                               | What may go into a trade, why it may not, and the 10% a receiver owes on a mortgaged site.                            |
| [rules/trade.interfaces.ts](../src/domain/rules/trade.interfaces.ts)                                     | TradableSite and TradeSide: the shapes the offer builder works in.                                                    |
| [rules/speedDie.utils.ts](../src/domain/rules/speedDie.utils.ts)                                         | When the Speed Die is in play, what it rolls, and what a three-of-a-kind means.                                       |

### Data

| File                                                                       | What it does                                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [board/indiaEditionBoard.ts](../src/domain/board/indiaEditionBoard.ts)     | The 40 board spaces with prices, rents, and colour groups.                           |
| [board/board.rules.test.ts](../src/domain/board/board.rules.test.ts)       | The board checked against section 13 of the ruleset doc, read as the fixture.        |
| [board/boardLayout.utils.ts](../src/domain/board/boardLayout.utils.ts)     | Maps a board index (0-39) to its cell in the 11x11 CSS grid.                         |
| [board/tokenMovement.utils.ts](../src/domain/board/tokenMovement.utils.ts) | Board geometry for the walk: steps and the path it passes through, either way round. |
| [cards/indiaEditionCards.ts](../src/domain/cards/indiaEditionCards.ts)     | Chance and Community Chest deck contents and effects.                                |
| [themes/indiaEditionTheme.ts](../src/domain/themes/indiaEditionTheme.ts)   | Game-facing theme data: name, currency symbol, token catalog. Colours live in SCSS.  |
| [board/boardSide.utils.ts](../src/domain/board/boardSide.utils.ts)         | Which edge of the board a space sits on; drives which side its colour ribbon hugs.   |

### Domain tests

| File                                                                                 | Covers                                                                                   |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [rules/gameEngine.test.ts](../src/domain/rules/gameEngine.test.ts)                   | Engine defaults, buy decision, auction on decline (seeded dice).                         |
| [rules/space.utils.test.ts](../src/domain/rules/space.utils.test.ts)                 | Type guards, including board-wide title-deed counts.                                     |
| [rules/playerActions.utils.test.ts](../src/domain/rules/playerActions.utils.test.ts) | Property-action availability and disabled reasons.                                       |
| [board/boardLayout.utils.test.ts](../src/domain/board/boardLayout.utils.test.ts)     | Grid mapping: corners, uniqueness, edges, wrapping.                                      |
| [board/tokenMovement.utils.test.ts](../src/domain/board/tokenMovement.utils.test.ts) | Steps and paths both ways, wrapping past GO either way, and a full round.                |
| [board/boardSide.utils.test.ts](../src/domain/board/boardSide.utils.test.ts)         | Corners, per-side membership, ten spaces a side, index wrapping.                         |
| [rules/holdings.utils.test.ts](../src/domain/rules/holdings.utils.test.ts)           | Net worth with mortgages and buildings, set progress, group ordering, empty-group guard. |
| [rules/buildings.utils.test.ts](../src/domain/rules/buildings.utils.test.ts)         | Both even rules as a table of levels, bank shortages, and what buildings could raise.    |
| [rules/trade.utils.test.ts](../src/domain/rules/trade.utils.test.ts)                 | Every proposal guard, mortgage transfer fees, and what is tradable.                      |
| [rules/speedDie.utils.test.ts](../src/domain/rules/speedDie.utils.test.ts)           | When the die activates, its six faces, and what counts as a triple.                      |

## `src/features/` — pages, state, persistence (React + Redux aware)

| File                                                                                                       | What it does                                                                                                  |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [setup/HomePage.tsx](../src/features/setup/HomePage.tsx)                                                   | New-game setup form plus the saved-game list with resume/delete.                                              |
| [setup/HomePage.test.tsx](../src/features/setup/HomePage.test.tsx)                                         | Integration tests for setup rendering and name validation.                                                    |
| [game/GamePage.tsx](../src/features/game/GamePage.tsx)                                                     | Game screen **wiring only**: selects state, derives view models, dispatches commands.                         |
| [game/GamePage.integration.test.tsx](../src/features/game/GamePage.integration.test.tsx)                   | Route to load to render to command, and the decision modal.                                                   |
| [game/GameOverlayLayer.tsx](../src/features/game/GameOverlayLayer.tsx)                                     | Everything that floats over the board: drawers, deed panel, toasts, decision modal.                           |
| [game/toastFeed.utils.ts](../src/features/game/toastFeed.utils.ts)                                         | Turns the history delta into toasts, and derives each one's tone from its wording.                            |
| [game/boardOwnership.utils.ts](../src/features/game/boardOwnership.utils.ts)                               | Builds the board's owner-marker map from ownership plus the theme token catalogue.                            |
| [game/sitePanel.utils.ts](../src/features/game/sitePanel.utils.ts)                                         | Resolves a picked space into the site panel's three ownership states.                                         |
| [game/toastFeed.utils.test.ts](../src/features/game/toastFeed.utils.test.ts)                               | Tone classification, the history delta, and the behaviour once the history cap is reached.                    |
| [game/gameView.selectors.ts](../src/features/game/gameView.selectors.ts)                                   | **Pure derivations**: game state → the view models the panels render. Where the screen's logic lives.         |
| [game/decisionViewModel.selectors.ts](../src/features/game/decisionViewModel.selectors.ts)                 | One view model per pending decision, split out when the building auction pushed the file past its line limit. |
| [game/auctionViewModel.selectors.ts](../src/features/game/auctionViewModel.selectors.ts)                   | The auction panel's view model: the resolved log, the live bidder, and the prefilled bid field.               |
| [game/auctionViewModel.selectors.test.ts](../src/features/game/auctionViewModel.selectors.test.ts)         | The resolved log, the live bidder, and every way a typed bid goes stale.                                      |
| [game/auctionBid.interfaces.ts](../src/features/game/auctionBid.interfaces.ts)                             | The keyed bid entry the ui slice holds.                                                                       |
| [game/gameView.interfaces.ts](../src/features/game/gameView.interfaces.ts)                                 | `TokenFinder`: a token id resolved to theme data, for selectors that need a player's colour.                  |
| [game/gameView.selectors.test.ts](../src/features/game/gameView.selectors.test.ts)                         | Unit tests for every selector, including each decision view model.                                            |
| [game/game.constants.ts](../src/features/game/game.constants.ts)                                           | Game-screen copy constants (board centre title and subtitle).                                                 |
| [game/gameSlice.ts](../src/features/game/gameSlice.ts)                                                     | Game slice + thunks bridging UI → engine → storage (`runGameCommand`, `createNewGame`, `loadGameById`).       |
| [game/gameSlice.integration.test.ts](../src/features/game/gameSlice.integration.test.ts)                   | Every thunk, asserting the store and localStorage agree.                                                      |
| [game/uiSlice.ts](../src/features/game/uiSlice.ts)                                                         | Ephemeral UI state not part of the saved game (auction bid input).                                            |
| [game/uiSlice.test.ts](../src/features/game/uiSlice.test.ts)                                               | The toast cap and dismissal, and the auction bid input.                                                       |
| [persistence/persistence.ts](../src/features/persistence/persistence.ts)                                   | localStorage read/write: save, load, delete, and the saved-game index.                                        |
| [persistence/persistence.integration.test.ts](../src/features/persistence/persistence.integration.test.ts) | Save/load round trip, and that a drawn card survives it.                                                      |
| [persistence/migrations.test.ts](../src/features/persistence/migrations.test.ts)                           | v1 saves upgrading, and future versions passing through untouched.                                            |
| [persistence/persistence.errors.test.ts](../src/features/persistence/persistence.errors.test.ts)           | Quota failures, and a behind-version save being written back.                                                 |
| [persistence/schema.ts](../src/features/persistence/schema.ts)                                             | Zod schemas validating anything read back out of storage.                                                     |
| [persistence/schema.test.ts](../src/features/persistence/schema.test.ts)                                   | The corruption the schema now refuses at the boundary.                                                        |
| [persistence/migrations.ts](../src/features/persistence/migrations.ts)                                     | Brings an older save up to the current GAME_STATE_VERSION, before validation.                                 |
| [persistence/persistence.errors.ts](../src/features/persistence/persistence.errors.ts)                     | StorageWriteError: a write the browser refused, told apart from a bug.                                        |
| [rules/RulesPage.tsx](../src/features/rules/RulesPage.tsx)                                                 | Rules booklet shell: header, section nav, and the section components.                                         |
| [rules/rulesSync.test.ts](../src/features/rules/rulesSync.test.ts)                                         | Enforces that the booklet and docs/india-edition-rules.md cover the same topics and quote the same numbers.   |
| [rules/ruleCoverage.constants.ts](../src/features/rules/ruleCoverage.constants.ts)                         | Which test proves which documented rule, by rule id.                                                          |
| [rules/rulesCoverage.test.ts](../src/features/rules/rulesCoverage.test.ts)                                 | Fails if a documented rule has no test, or a claimed test has gone.                                           |
| [rules/RulesPage.test.tsx](../src/features/rules/RulesPage.test.tsx)                                       | Integration tests: every nav link resolves to a rendered section.                                             |
| [game/GameUnavailable.tsx](../src/features/game/GameUnavailable.tsx)                                       | Shown when the routed game is missing or fails schema validation.                                             |
| [game/hooks/useActiveGame.ts](../src/features/game/hooks/useActiveGame.ts)                                 | Loads the routed game and resolves its theme and currency symbol.                                             |
| [game/hooks/useGameCommands.ts](../src/features/game/hooks/useGameCommands.ts)                             | Binds every command the game screen dispatches.                                                               |
| [setup/hooks/useGameSetupForm.ts](../src/features/setup/hooks/useGameSetupForm.ts)                         | Setup form state; delegates the rules to setupValidation.utils.                                               |
| [hooks/useGameSetupForm.test.ts](../src/features/setup/hooks/useGameSetupForm.test.ts)                     | The player-count clamp notice and the Speed Die setting.                                                      |
| [setup/setup.interfaces.ts](../src/features/setup/setup.interfaces.ts)                                     | The game-setup form draft shape.                                                                              |
| [setup/setupValidation.utils.ts](../src/features/setup/setupValidation.utils.ts)                           | Pure setup validation: non-empty, unique names, unique tokens.                                                |
| [setup/setupValidation.utils.test.ts](../src/features/setup/setupValidation.utils.test.ts)                 | Unit tests for every validation rule and its precedence.                                                      |
| [setup/setup.constants.ts](../src/features/setup/setup.constants.ts)                                       | Setup form defaults and error messages.                                                                       |
| [game/hooks/useGameOverlays.ts](../src/features/game/hooks/useGameOverlays.ts)                             | Which overlay is open: activity drawer, player details, or a space deed.                                      |

## `src/components/game/` — presentational (props in, callbacks out, no store)

| File                                                                              | What it does                                                                                                                                                                                  |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DiceDock.tsx](../src/components/game/DiceDock.tsx)                               | Fixed dice roller: tumble animation, roll sound, fires `onRoll` when the animation ends.                                                                                                      |
| [diceDock.constants.ts](../src/components/game/diceDock.constants.ts)             | Dice animation timing and volume.                                                                                                                                                             |
| [SpaceDetailCard.tsx](../src/components/game/SpaceDetailCard.tsx)                 | Title-deed modal: rent schedule, prices, per-kind copy. Closes on backdrop click or Escape.                                                                                                   |
| [SpaceDetailCard.test.tsx](../src/components/game/SpaceDetailCard.test.tsx)       | Per-kind rendering, themed colour-group class, close on button/Escape/backdrop.                                                                                                               |
| [spaceIcons.constants.ts](../src/components/game/spaceIcons.constants.ts)         | Icon lookup for board spaces, shared by the board cell and the title deed.                                                                                                                    |
| [deed/SpaceCard.tsx](../src/components/game/deed/SpaceCard.tsx)                   | The site card: colour strip, title, icon, per-kind deed body, and optional actions. Supplies its own fixed-size surface; shared by the deed modal, the buy decision, and the holdings drawer. |
| [deed/SpaceCard.test.tsx](../src/components/game/deed/SpaceCard.test.tsx)         | The card shell class, the colour strip and its per-kind colour, the deed label, and optional actions.                                                                                         |
| [trade/TradeBuilder.test.tsx](../src/components/game/trade/TradeBuilder.test.tsx) | Both columns, picking and unpicking, blocked sites, jail-card limits.                                                                                                                         |
| [deed/StreetDeed.tsx](../src/components/game/deed/StreetDeed.tsx)                 | Title-deed body for a street: site values and full rent schedule (the colour strip belongs to SpaceCard).                                                                                     |
| [deed/RailwayDeed.tsx](../src/components/game/deed/RailwayDeed.tsx)               | Title-deed body for a railway: rent by stations owned.                                                                                                                                        |
| [deed/UtilityDeed.tsx](../src/components/game/deed/UtilityDeed.tsx)               | Title-deed body for a utility: dice-multiplier rents.                                                                                                                                         |
| [deed/DeedPrimaryStats.tsx](../src/components/game/deed/DeedPrimaryStats.tsx)     | Site value and mortgage value, shared by all three deed bodies.                                                                                                                               |
| [deed/SpaceDescription.tsx](../src/components/game/deed/SpaceDescription.tsx)     | Explanatory copy for spaces with no rent table (GO, tax, jail, decks).                                                                                                                        |

### Board

| File                                                                                  | What it does                                                                           |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [board/BoardGrid.tsx](../src/components/game/board/BoardGrid.tsx)                     | The 11x11 board: centre plus all 40 space cells.                                       |
| [board/BoardSpaceCell.tsx](../src/components/game/board/BoardSpaceCell.tsx)           | One square: colour bar (streets only), icon, name, player tokens.                      |
| [board/BoardSpaceCell.test.tsx](../src/components/game/board/BoardSpaceCell.test.tsx) | Accessible names, the owner dot, and the building pips.                                |
| [board/BoardCenter.tsx](../src/components/game/board/BoardCenter.tsx)                 | Decorative centre: deck markers and logo ribbon.                                       |
| [board/BoardTokenLayer.tsx](../src/components/game/board/BoardTokenLayer.tsx)         | Player tokens drawn over the board, placed by grid cell so they cannot resize a space. |

### Panels

| File                                                                                                                        | What it does                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [panels/CommandErrorBanner.tsx](../src/components/game/panels/CommandErrorBanner.tsx)                                       | Shows a command the engine rejected, instead of failing silently.                                                                       |
| [panels/CommandErrorBanner.test.tsx](../src/components/game/panels/CommandErrorBanner.test.tsx)                             | Hidden when clear, alert role, dismissal.                                                                                               |
| [panels/PlayersPanel.tsx](../src/components/game/panels/PlayersPanel.tsx)                                                   | Player cards: cash, property count, position, jail status.                                                                              |
| [panels/panels.interfaces.ts](../src/components/game/panels/panels.interfaces.ts)                                           | Shared panel view models and decision handler types.                                                                                    |
| [panels/decisions/DecisionPanel.tsx](../src/components/game/panels/decisions/DecisionPanel.tsx)                             | Picks the right decision UI for the pending decision.                                                                                   |
| [panels/decisions/BuyOrAuctionDecision.tsx](../src/components/game/panels/decisions/BuyOrAuctionDecision.tsx)               | Buy-or-auction prompt on landing unowned.                                                                                               |
| [panels/decisions/BuildingPlacementDecision.tsx](../src/components/game/panels/decisions/BuildingPlacementDecision.tsx)     | Where a building won at auction goes: the winner picks from their eligible sites.                                                       |
| [panels/decisions/BuyOrAuctionDecision.test.tsx](../src/components/game/panels/decisions/BuyOrAuctionDecision.test.tsx)     | Deed rendering per space kind, price on the button, and the callbacks.                                                                  |
| [panels/decisions/AuctionDecision.tsx](../src/components/game/panels/decisions/AuctionDecision.tsx)                         | Two columns: the deed, and the bidding beside it.                                                                                       |
| [panels/decisions/AuctionDecision.test.tsx](../src/components/game/panels/decisions/AuctionDecision.test.tsx)               | The deed, the log in order, the live line, the prefill, and Submit disabled with its reason.                                            |
| [panels/decisions/AuctionLedger.tsx](../src/components/game/panels/decisions/AuctionLedger.tsx)                             | The auction as a chat log: opened at, bid, passed, and the live "X bidding..." line.                                                    |
| [panels/decisions/AuctionBidForm.tsx](../src/components/game/panels/decisions/AuctionBidForm.tsx)                           | The prefilled bid field, the raise chips, and the guarded Submit.                                                                       |
| [panels/decisions/JailDecision.tsx](../src/components/game/panels/decisions/JailDecision.tsx)                               | Jail exit choices.                                                                                                                      |
| [panels/decisions/JailDecision.test.tsx](../src/components/game/panels/decisions/JailDecision.test.tsx)                     | All three ways out of Jail, and the attempt counter.                                                                                    |
| [panels/decisions/LiquidationDecision.tsx](../src/components/game/panels/decisions/LiquidationDecision.tsx)                 | Debt, the sites that could cover it, and the pay or declare-bankruptcy choice.                                                          |
| [panels/decisions/GameOverDecision.tsx](../src/components/game/panels/decisions/GameOverDecision.tsx)                       | Announces the winner and offers the way back to the home page.                                                                          |
| [panels/decisions/TradeResponseDecision.tsx](../src/components/game/panels/decisions/TradeResponseDecision.tsx)             | An offer as the recipient reads it: both sides, read-only, accept or reject.                                                            |
| [panels/decisions/TradeResponseDecision.test.tsx](../src/components/game/panels/decisions/TradeResponseDecision.test.tsx)   | The per-site mortgage choice, its running total, and what is sent on accept.                                                            |
| [panels/decisions/SpeedDieBusDecision.tsx](../src/components/game/panels/decisions/SpeedDieBusDecision.tsx)                 | The Bus face: one white die, the other, or both.                                                                                        |
| [panels/decisions/SpeedDieDestinationDecision.tsx](../src/components/game/panels/decisions/SpeedDieDestinationDecision.tsx) | Three of a kind: every space on the board, as a choice.                                                                                 |
| [trade/TradeBuilder.tsx](../src/components/game/trade/TradeBuilder.tsx)                                                     | The two-column offer builder: what you give against what you get.                                                                       |
| [trade/trade.interfaces.ts](../src/components/game/trade/trade.interfaces.ts)                                               | View models for the builder and the offer summary.                                                                                      |
| [hooks/useDiceRoller.ts](../src/components/game/hooks/useDiceRoller.ts)                                                     | Dice animation state: tumbling faces, roll sound, timers, committing the roll.                                                          |
| [hooks/useDiceRoller.test.ts](../src/components/game/hooks/useDiceRoller.test.ts)                                           | Roll lifecycle, and that a throwing handler never strands the dock.                                                                     |
| [hooks/useAnimatedTokenPositions.ts](../src/components/game/hooks/useAnimatedTokenPositions.ts)                             | Walks tokens a space at a time off the clock, with a tak per step and a watchdog behind it.                                             |
| [hooks/useAnimatedTokenPositions.test.ts](../src/components/game/hooks/useAnimatedTokenPositions.test.ts)                   | Walks both ways, a full round, the no-burst guard, and a tak per step.                                                                  |
| [hooks/tokenStepSound.test.ts](../src/components/game/hooks/tokenStepSound.test.ts)                                         | The step clip measured: short enough for the fastest step, and audible from sample zero.                                                |
| [hooks/tokenStepSound.test.ts](../src/components/game/hooks/tokenStepSound.test.ts)                                         | The step clip measured: short enough for the fastest step, and audible from sample zero.                                                |
| [panels/TurnControls.tsx](../src/components/game/panels/TurnControls.tsx)                                                   | Bottom-right cluster: end-turn button plus the dice, level with the board.                                                              |
| [panels/TurnControls.test.tsx](../src/components/game/panels/TurnControls.test.tsx)                                         | End-turn vs take-extra-roll, the roll label, and the Speed Die.                                                                         |
| [panels/PlayersPanel.test.tsx](../src/components/game/panels/PlayersPanel.test.tsx)                                         | Stack collapse/expand, click target, token colours, full-table support.                                                                 |
| [overlays/DecisionModal.tsx](../src/components/game/overlays/DecisionModal.tsx)                                             | Blocking centre modal for a pending decision. Deliberately not dismissible.                                                             |
| [overlays/SideDrawer.tsx](../src/components/game/overlays/SideDrawer.tsx)                                                   | Right-hand drawer shell: backdrop, header, Escape to close.                                                                             |
| [overlays/ActivityDrawer.tsx](../src/components/game/overlays/ActivityDrawer.tsx)                                           | Game event log, opened from the floating activity button.                                                                               |
| [overlays/ActivityButton.tsx](../src/components/game/overlays/ActivityButton.tsx)                                           | Floating control that opens the activity drawer.                                                                                        |
| [overlays/PlayerDetailDrawer.tsx](../src/components/game/overlays/PlayerDetailDrawer.tsx)                                   | A player's stats and holdings, opened by clicking their card.                                                                           |
| [overlays/PlayerDetailDrawer.test.tsx](../src/components/game/overlays/PlayerDetailDrawer.test.tsx)                         | Stack order and contents, the shared card shell, promoting a holding without removing it from the deck, empty state, no board position. |
| [overlays/ToastStack.tsx](../src/components/game/overlays/ToastStack.tsx)                                                   | Action feedback, stacked above every overlay, each row dismissing itself on a timer.                                                    |
| [overlays/overlays.interfaces.ts](../src/components/game/overlays/overlays.interfaces.ts)                                   | Shared overlay shapes: the toast, and the site panel's view model.                                                                      |
| [board/board.interfaces.ts](../src/components/game/board/board.interfaces.ts)                                               | Shared board shapes: the owner marker and animated token positions.                                                                     |
| [panels/decisions/CardDrawDecision.tsx](../src/components/game/panels/decisions/CardDrawDecision.tsx)                       | The drawn Chance / Community Chest card, shown before its effect is applied.                                                            |
| [panels/decisions/CardDrawDecision.test.tsx](../src/components/game/panels/decisions/CardDrawDecision.test.tsx)             | Card copy, who drew it, and that OK is the only control.                                                                                |
| [overlays/HoldingsStack.tsx](../src/components/game/overlays/HoldingsStack.tsx)                                             | Collapsed holdings as one overlapping stack, colour-grouped: the same fixed-size `SpaceCard`, clipped to a title-only peek.             |
| [panels/PlayerBadges.tsx](../src/components/game/panels/PlayerBadges.tsx)                                                   | Status badges on a player card: jail card held, jail progress, bankruptcy.                                                              |
| [panels/PlayerBadges.test.tsx](../src/components/game/panels/PlayerBadges.test.tsx)                                         | Unit tests for every badge and the empty case.                                                                                          |
| [panels/PlayerCard.tsx](../src/components/game/panels/PlayerCard.tsx)                                                       | One player at a glance: net worth, cash, sites, colour-set pips, status badges.                                                         |
| [panels/PlayerCard.test.tsx](../src/components/game/panels/PlayerCard.test.tsx)                                             | Net worth headline, conditional mortgaged count, pips per group, complete-set state.                                                    |
| [panels/ColorGroupPips.tsx](../src/components/game/panels/ColorGroupPips.tsx)                                               | Colour-set progress swatches shown on a player card.                                                                                    |

## `src/components/setup/` — presentational setup components

| File                                                                               | What it does                                                    |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [SetupHero.tsx](../src/components/setup/SetupHero.tsx)                             | Intro card: what the app is and the locked v1 scope.            |
| [setup/SpeedDieToggle.tsx](../src/components/setup/SpeedDieToggle.tsx)             | The one optional ruleset choice, agreed before the game starts. |
| [setup/RulesetSummary.tsx](../src/components/setup/RulesetSummary.tsx)             | Headline economics, quoted from the constants.                  |
| [setup/GameIdentityFields.tsx](../src/components/setup/GameIdentityFields.tsx)     | Game name and theme.                                            |
| [PlayerConfigRow.tsx](../src/components/setup/PlayerConfigRow.tsx)                 | One player's name and token inputs.                             |
| [RecentGamesList.tsx](../src/components/setup/RecentGamesList.tsx)                 | Saved games with continue and delete, or the empty state.       |
| [setup/RecentGamesList.test.tsx](../src/components/setup/RecentGamesList.test.tsx) | The two-step delete.                                            |

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
| `RulesSpeedDie.tsx`          | Speed Die: the optional variant, its faces, and the doubles interactions.                              |
| `RulesClosing.tsx`           | Closing notes.                                                                                         |

## `src/shared/` — cross-cutting helpers

| File                                                                                        | What it does                                                                            |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [constants/testIds.constants.ts](../src/shared/constants/testIds.constants.ts)              | Every `data-testid`, plus `scopedTestId` for repeated elements. Tests import from here. |
| [utils/logger.enums.ts](../src/shared/utils/logger.enums.ts)                                | Log severity levels.                                                                    |
| [utils/logger.interfaces.ts](../src/shared/utils/logger.interfaces.ts)                      | One captured log entry.                                                                 |
| [utils/logger.utils.ts](../src/shared/utils/logger.utils.ts)                                | App log: console + capped ring + localStorage, exposed as `window.monopolyLog`.         |
| [shared/components/ErrorBoundary.tsx](../src/shared/components/ErrorBoundary.tsx)           | Catches a render that throws, logs it, and offers a way back.                           |
| [shared/components/ErrorBoundary.test.tsx](../src/shared/components/ErrorBoundary.test.tsx) | The fallback, the log entry, and the full-reload way out.                               |
| [utils/logger.utils.test.ts](../src/shared/utils/logger.utils.test.ts)                      | Ring cap, persistence, error filtering, storage-failure safety.                         |
| [utils/money.utils.ts](../src/shared/utils/money.utils.ts)                                  | `formatMoney` and currency-symbol fallback. The one place money is rendered.            |
| [utils/audio.utils.ts](../src/shared/utils/audio.utils.ts)                                  | `playSound` (a `play()` returning nothing must not throw) and a round-robin clip pool.  |
| [utils/audio.utils.test.ts](../src/shared/utils/audio.utils.test.ts)                        | Every way play() can fail, and the pool round-robin.                                    |
| [utils/money.utils.test.ts](../src/shared/utils/money.utils.test.ts)                        | Unit tests for money formatting.                                                        |
| [hooks/useEscapeKey.ts](../src/shared/hooks/useEscapeKey.ts)                                | Escape-to-dismiss for overlays, with listener cleanup.                                  |
| [hooks/useEscapeKey.test.ts](../src/shared/hooks/useEscapeKey.test.ts)                      | Unit tests, including that the listener is removed on unmount.                          |

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
| [components/\_buttons.scss](../src/styles/components/_buttons.scss)           | Primary / secondary / danger buttons.                                                        |
| [components/\_forms.scss](../src/styles/components/_forms.scss)               | Inputs, selects, labels, setup form grids.                                                   |
| [components/\_panels.scss](../src/styles/components/_panels.scss)             | Panel/hero/summary/decision surfaces, headings, badges, empty states.                        |
| [components/\_dice.scss](../src/styles/components/_dice.scss)                 | Dice dock, die faces, pip grid positions, tumble keyframes.                                  |
| [components/\_space-detail.scss](../src/styles/components/_space-detail.scss) | Title-deed modal: backdrop, card, colour band, rent table.                                   |
| [components/\_auction.scss](../src/styles/components/_auction.scss)           | Auction panel: the fixed two columns, the scrolling chat log, raise chips.                   |
| [components/\_player.scss](../src/styles/components/_player.scss)             | Player cards, metrics, owned-property cards.                                                 |
| [pages/\_game.scss](../src/styles/pages/_game.scss)                           | Three-column game layout, turn panel, activity list, responsive rules.                       |
| [pages/\_home.scss](../src/styles/pages/_home.scss)                           | Recent-games list styling.                                                                   |
| [pages/\_rules.scss](../src/styles/pages/_rules.scss)                         | Rules booklet typography and tables.                                                         |

## Test infrastructure

| File                                                                                      | What it does                                                                                                      |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [src/test/renderWithProviders.tsx](../src/test/renderWithProviders.tsx)                   | RTL helper: a component in a **fresh** Redux store + `MemoryRouter`; returns the store, accepts `preloadedState`. |
| [test/scriptedRandomSource.ts](../src/test/scriptedRandomSource.ts)                       | Dice that roll what a test asks for, and fail loudly if the script drifts.                                        |
| [test/scriptedRandomSource.interfaces.ts](../src/test/scriptedRandomSource.interfaces.ts) | ScriptedRoll: the two white dice and an optional Speed Die face.                                                  |
| [test/scriptedRandomSource.test.ts](../src/test/scriptedRandomSource.test.ts)             | That the scripted source is honest about drift and range.                                                         |
| [src/test/renderWithProviders.test.tsx](../src/test/renderWithProviders.test.tsx)         | Proves each render gets its own store and that `preloadedState` reaches a selector.                               |
| [src/setupTests.ts](../src/setupTests.ts)                                                 | Vitest setup; jest-dom matchers and a `localStorage` reset before each test.                                      |
| [src/setupTests.test.ts](../src/setupTests.test.ts)                                       | Proves the storage reset actually runs between tests.                                                             |
| [tests/e2e/helpers.ts](../tests/e2e/helpers.ts)                                           | Shared `startGame` / `advanceGame` helpers and corner reference data.                                             |
| [tests/e2e/setup.spec.ts](../tests/e2e/setup.spec.ts)                                     | Creating a game and landing on a resumable route.                                                                 |
| [tests/e2e/board.spec.ts](../tests/e2e/board.spec.ts)                                     | Corner geometry, title deed, ribbon placement, dividers, outlines, theming.                                       |
| [tests/e2e/layout.spec.ts](../tests/e2e/layout.spec.ts)                                   | Two-column layout, site-panel actions, dice placement, player stack.                                              |
| [tests/e2e/overlays.spec.ts](../tests/e2e/overlays.spec.ts)                               | Decision modal, activity drawer, player detail drawer, dice roll.                                                 |
| [tests/e2e/full-table.spec.ts](../tests/e2e/full-table.spec.ts)                           | Eight-player layout: token cluster stays on the board, dice stay reachable.                                       |
| [tests/e2e/mortgage.spec.ts](../tests/e2e/mortgage.spec.ts)                               | Mortgaging out of a debt, the dead end without assets, and the site panel.                                        |
| [tests/e2e/buildings.spec.ts](../tests/e2e/buildings.spec.ts)                             | Building and selling from the site panel, the even rules, and selling buildings mid-liquidation.                  |
| [tests/e2e/jail.spec.ts](../tests/e2e/jail.spec.ts)                                       | A jailed player taking their three free attempts at doubles.                                                      |
| [tests/e2e/trade.spec.ts](../tests/e2e/trade.spec.ts)                                     | Proposing, accepting and rejecting a two-sided deal.                                                              |
| [tests/e2e/auction.spec.ts](../tests/e2e/auction.spec.ts)                                 | The auction panel: the deed, the log, the prefilled bid, a refused bid, and the win.                              |
| [tests/e2e/movement.spec.ts](../tests/e2e/movement.spec.ts)                               | A full round on Advance to GO, a backward card, the backward trip to Jail, and the roll gate.                     |
| [tests/e2e/speed-die.spec.ts](../tests/e2e/speed-die.spec.ts)                             | The third die, the bus choice, and a three-of-a-kind move.                                                        |
| [tests/e2e/rules.spec.ts](../tests/e2e/rules.spec.ts)                                     | Booklet nav resolves, the FAQ answers, and amounts render in ₹.                                                   |
| [tests/e2e/feedback.spec.ts](../tests/e2e/feedback.spec.ts)                               | Toasts, the drawn-card modal, owner marks, the three site-panel states, ₹.                                        |

## Config

| File                                            | What it does                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| [vite.config.mjs](../vite.config.mjs)           | Vite build/dev config **and** the Vitest config (jsdom, globals, setup file).     |
| [project.json](../project.json)                 | NX targets wrapping Vite: serve, build, test, lint, preview.                      |
| [nx.json](../nx.json)                           | NX workspace config: caching, target defaults.                                    |
| [tsconfig.json](../tsconfig.json)               | TypeScript config. `strict: true`, target es2020, no exclusions, no path aliases. |
| [.eslintrc.json](../.eslintrc.json)             | Lint rules: layer boundaries, naming conventions, file naming, size limits.       |
| [.prettierrc.json](../.prettierrc.json)         | Prettier formatting options.                                                      |
| [playwright.config.ts](../playwright.config.ts) | E2E config; auto-starts the dev server on :3000.                                  |
| [.claude/launch.json](../.claude/launch.json)   | Dev-server definition used by the in-editor browser preview.                      |

## Assets and tools

| File                                                              | What it does                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [assets/audio/token-step.wav](../src/assets/audio/token-step.wav) | The token step pop. Trimmed from the source pack - 48ms mono, audible from 1.8ms.                      |
| [assets/audio/dice-roll.wav](../src/assets/audio/dice-roll.wav)   | The dice throw. CC0, sourced - see ATTRIBUTION.md.                                                     |
| [assets/audio/ATTRIBUTION.md](../src/assets/audio/ATTRIBUTION.md) | Where each clip came from, and the licence position on each.                                           |
| [tools/generate-token-step.py](../tools/generate-token-step.py)   | Rebuilds token-step.wav: a wooden knock from a noise transient and four non-harmonic damped sinusoids. |

## Other

| File                                                        | What it does                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| [src/reportWebVitals.ts](../src/reportWebVitals.ts)         | Optional web-vitals reporting hook. Not currently called.  |
| [src/types/assets.d.ts](../src/types/assets.d.ts)           | Module declarations for importing images, audio, and JSON. |
| [src/types/css-modules.d.ts](../src/types/css-modules.d.ts) | Module declarations for CSS/SCSS module imports.           |

---
