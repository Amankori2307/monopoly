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
- **The colour ribbon hugs the inner edge of its cell**, running along the cell's short side:
  the bottom row bands across its top, the top row across its bottom, the left column down its
  right, the right column down its left — as on a printed board. The side comes from
  [`getBoardSide`](../../src/domain/board/boardSide.utils.ts) as a `side-*` class, and the cell is
  a flex row or column accordingly, so the ribbon needs no per-side markup.
- **Space names run along each cell's long axis.** Left and right column cells are landscape, so
  horizontal text already flows the long way. Top and bottom rows are portrait, so their names are
  set vertically (`writing-mode: vertical-rl`, the bottom row rotated so both rows read inward
  from the board edge) instead of wrapping into four cramped lines across the short side. Long
  names wrap into further vertical lines, and a single long word may break — as printed boards do.
  Corner cells are square and keep an upright, centred label.
- **Each cell reads ribbon → icon → text** from the board centre outward, and the icon rotates
  with the text (±90° on the vertical rows, upright on the side columns) so the cell reads as one
  unit. The label is a flex line whose direction follows the cell's `side-*` class.
- **Cells have no padding; the colour ribbon is full bleed.** Content rows carry the inset
  instead (`$space-inset`), so a street's ribbon reaches the cell edges like a printed board.
- **The cell divider lives on `::after`, not on the cell.** An inset `box-shadow` on the cell
  paints _under_ its children, so a full-bleed ribbon would hide it and neighbouring ribbons of
  the same colour would run together. The pseudo-element sits above the ribbon; `.board-grid`
  closes the board's top and left edges, which the per-cell right/bottom lines leave open.
- **No accent outline on hover or occupancy.** Both are shown by a background shift alone. The
  keyboard `:focus-visible` ring stays — that one is an accessibility need, not decoration.
- **The action rail is always visible but disabled** while its engine commands are scaffolded.
  Availability comes from `getPropertyActions`, a pure function, so the rail lights up on its own
  once those commands land. Disabled buttons keep their colour (the base reset's 0.45 opacity
  made the rail unreadable).
- **Rail colours are theme tokens** (`--action-build` and friends), so a new theme restyles them.
- **The dice have no panel of their own.** They sit in the flow beside the board rather than
  floating on a blurred card, which is what the reference shows.
- **`max-height` animates the stack, not `height`.** Cards vary slightly in height with name
  length, and `max-height` needs no measurement to transition cleanly.
- **The stack has a real `<button>` overlay** rather than a click handler on a `div`, so
  keyboard and screen-reader users can expand it too.

## State and data

Reads `activeGame` and `uiHints` from `game`, and `auctionBidInput` from `ui`. Holds one piece of
local state: the selected space id for the title-deed modal.

## Tests

| Level | File                                                                             | Covers                                                                     |
| ----- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Unit  | [boardLayout.utils.test.ts](../../src/domain/board/boardLayout.utils.test.ts)    | Index → grid cell: corners, uniqueness, edges, wrapping.                   |
| Unit  | [gameView.selectors.test.ts](../../src/features/game/gameView.selectors.test.ts) | The view models every panel receives.                                      |
| E2E   | [layout.spec.ts](../../tests/e2e/layout.spec.ts)                                 | Three-column ordering; corner geometry; rail actions present and disabled. |

## Known gaps

- `GamePage` still exceeds the 120-line function warning.
- The rail cannot dispatch yet: build/mortgage need a property picker to supply a `spaceId`.
- No dedicated component tests for the board and panel components (covered indirectly).
