# Game screen layout

**Status:** Shipped
**Entry points:** [src/features/game/GamePage.tsx](../../src/features/game/GamePage.tsx), [src/styles/pages/\_game.scss](../../src/styles/pages/_game.scss)

## What it does

Arranges the game screen in three columns: property actions on the left, the board in the
middle, and the player sidebar on the right, with the dice docked bottom-right. It collapses to
a single column on narrower screens.

## How it works

`.game-layout` is a CSS grid: `<rail width> minmax(0, 1fr) minmax(320px, 380px)`. The board is
square (`aspect-ratio: 1`) and capped by viewport height (`max-width: calc(100dvh - 72px)`) so it
never grows taller than the window, then centred in its column.

Composition:

| Region    | Component                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------- |
| Left rail | [ActionRail](../../src/components/game/panels/ActionRail.tsx)                                      |
| Board     | [BoardGrid](../../src/components/game/board/BoardGrid.tsx) → `BoardCenter` + 40 × `BoardSpaceCell` |
| Sidebar   | `TurnPanel`, `DecisionPanel`, `HintsPanel`, `PlayersPanel`, `HoldingsPanel`, `ActivityPanel`       |
| Dice      | [DiceDock](../../src/components/game/DiceDock.tsx), fixed bottom-right                             |

## Key decisions

- **`GamePage` is wiring only.** It selects state, calls `gameView.selectors`, and dispatches.
  Every piece of rendering is a small component, so the screen is composable and each part is
  testable on its own.
- **Board row templates depend on children.** Only street spaces render a colour bar, so only
  `.space-street` gets the three-row template. A shared three-row default was what previously
  clipped the corner labels — see [\_board.scss](../../src/styles/components/_board.scss).
- **The action rail is always visible but disabled** while its engine commands are scaffolded.
  Availability comes from `getPropertyActions`, a pure function, so the rail lights up on its own
  once those commands land. Disabled buttons keep their colour (the base reset's 0.45 opacity
  made the rail unreadable).
- **Rail colours are theme tokens** (`--action-build` and friends), so a new theme restyles them.

## State and data

Reads `activeGame` and `uiHints` from `game`, and `auctionBidInput` from `ui`. Holds one piece of
local state: the selected space id for the title-deed modal.

## Tests

| Level | File                                                                             | Covers                                                                     |
| ----- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Unit  | [boardLayout.utils.test.ts](../../src/domain/board/boardLayout.utils.test.ts)    | Index → grid cell: corners, uniqueness, edges, wrapping.                   |
| Unit  | [gameView.selectors.test.ts](../../src/features/game/gameView.selectors.test.ts) | The view models every panel receives.                                      |
| E2E   | [app.spec.ts](../../tests/e2e/app.spec.ts)                                       | Three-column ordering; corner geometry; rail actions present and disabled. |

## Known gaps

- `GamePage` still exceeds the 120-line function warning.
- The rail cannot dispatch yet: build/mortgage need a property picker to supply a `spaceId`.
- No dedicated component tests for the board and panel components (covered indirectly).
