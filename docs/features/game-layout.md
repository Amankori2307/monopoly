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
- **The action rail is gone, and the layout is two columns.** It offered four buttons that could
  never fire: every property command needs a `spaceId` and the rail had none. Site actions come
  from the site panel, which is reached by clicking a site on the board, and the board takes the
  freed column.
- **The dice have no panel of their own.** They sit in the flow beside the board rather than
  floating on a blurred card, which is what the reference shows.
- **`max-height` animates the stack, not `height`.** Cards vary slightly in height with name
  length, and `max-height` needs no measurement to transition cleanly.
- **The stack has a real `<button>` overlay** rather than a click handler on a `div`, so
  keyboard and screen-reader users can expand it too.

## Board and card details

### The Jail corner

One square holding two places: a barred cell inset towards the board centre, and an L-shaped
"Just Visiting" band along the two outer edges.
[JailCorner](../../src/components/game/board/JailCorner.tsx) draws it;
`getTokenPosition` in [boardLayout.utils.ts](../../src/domain/board/boardLayout.utils.ts) decides
where a piece stands.

Before this, nothing under `components/game/board/` knew `player.inJail` at all — a jailed player and
a visitor were drawn at **identical coordinates**, told apart only by the order the players happened
to be iterated in.

- **Routing is `space === JAIL_POSITION && player.inJail`, and both halves matter.** The walk lags the
  engine by a second or so, so a player the engine has already jailed is still crossing the board;
  reading `inJail` alone would draw them behind bars before they arrived.
- **The band is one number.** `JAIL_BAND_FRACTION` reaches the stylesheet as an inline
  `--jail-band-size` and the token maths as a multiplier, so the band the eye sees and the band a
  piece stands on cannot drift apart — the obvious way for this to rot. An e2e test measures the
  cell's insets against that same constant.
- **Jailed pieces cluster; visitors queue.** The cell reuses the ordinary crowd slots at 0.85 scale.
  The band is a corridor, so visitors take a **one-dimensional** slot table signed from the elbow —
  a second axis would put a piece through a wall. A lone visitor stands at the elbow, where a printed
  board puts them, and a crowd grows both ways along the arms.
- **Crowds are counted per region** (`tokenCrowdKey`), or the only visitor on the board would stand in
  the second slot of a cluster they are not part of.
- **Which way is "inward" is derived from the grid**, not written as "up and to the right". Where the
  corner sits is a fact the layout already owns. The _stylesheet_ does have to assume bottom-left —
  it cannot read the grid — and `board.rules.test.ts` pins index 10 there.
- **The bars are drawn, not a `repeating-linear-gradient`.** Gradient stops are pixels and the square
  is not, so the bar count would change with the screen: three on a phone, nine on a monitor.
- **The word sits above the window, not in it.** Centred, it landed exactly under the first token of
  the jailed cluster, and an 18px piece covers an 18px word completely.
- **Both labels are split from `space.name`**, so the board data stays the single source of the
  wording, and a visually-hidden separator keeps the square reading as the one contiguous name the
  corner test asserts.
- **The corner drops its glyph.** At ~63px the square cannot hold bars, a 34px icon and a word.
  `CORNER_GLYPHS[Jail]` stays registered, because the deed card still uses it.

### Space icons

Eleven glyphs, resolved by
[spaceIcon.registry.ts](../../src/components/game/icons/spaceIcon.registry.ts) and drawn by
[SpaceIcon](../../src/components/game/icons/SpaceIcon.tsx) — one `<svg>` wrapper for all of them, so
the fill, the aria attributes and the focusability cannot drift apart. The shapes live as data
(viewBox + path, no colour) in `spaceGlyphs.ts`, generated from the `.svg` files they replaced.

They are **inline SVG filled with `currentColor`**, taking `--board-icon-ink`. As `<img src>` the ink
was baked into the file, so under a dark theme they were near-black paths on a near-black cell and no
CSS could reach them. An e2e test flips `data-theme` and asserts the colour moves — a hardcoded
colour of any kind simply will not.

The per-kind `opacity` steps (0.62 Chance/Community Chest, 0.74 edge, 0.82 corner) stay as they are:
they encode relative hierarchy, which is the same under any theme, so one ink token layered with them
beats a token per weight.

**Overrides are keyed by board index, not by name.** Two spaces need something other than their
kind's default — Electric Company (12) and Super Tax (38). Keyed by display name, as they were,
renaming a space silently dropped its icon with nothing failing. Indices are positional and stable by
construction, and the registry test asserts each override still holds the kind it was written for.

**Streets carry no glyph.** The ribbon is a street's identity on a printed board, and a glyph on every
square flattens the distinction that makes railway/utility/chance scannable across forty of them.
There is also no room: the side columns already had their `padding-block` trimmed to buy the longest
names a third line, and the name-clipping test measures exactly the axis an icon would take.

### Houses and hotels

Drawn by [BuildingPiece](../../src/components/game/board/BuildingPiece.tsx) and placed by
`BuildingPips` inside `BoardSpaceCell`: up to four gabled houses along the site's colour ribbon, or
one hotel with lit windows. They are **inline SVG** — a CSS box cannot carry a pitched roof, and a
`clip-path` silhouette loses the outline that keeps a green house legible on a green ribbon. Drawing
also keeps them clear of the sharp-corner system, since an SVG's own geometry is not a
`border-radius`.

The **run direction is CSS** (the ribbon's axis, already in the stylesheet) but the **hotel's drawing
is chosen in JS**, one geometry per axis. A CSS rotation happens after layout and would lay the roof
on its side — the same reason `MortgageStamp` picks its box per variant. Houses are never rotated at
all: a rotated word still reads, a rotated house reads as a broken shape. The windows come off below
the tablet breakpoint, where they are under a device pixel.

The **owner dot hugs the cell's outer edge**, opposite the ribbon, per side — it used to sit
top-right on every side, which on the bottom row is where the ribbon is, so it covered the pieces
standing on it.

### Player tokens

Drawn by [BoardTokenLayer](../../src/components/game/board/BoardTokenLayer.tsx), an overlay above
the board. Each token is positioned absolutely at its space's centre (`getBoardCellCenter`), so
moving is a real CSS transition rather than a jump between grid cells. Tokens used to sit in the
cell's flow, which made an occupied cell taller than its neighbours and shifted the board.

A token is a small **shaded sphere in the player's colour** — one of the documented physical-piece
exceptions to the sharp-corner system. The base colour is set inline from `ThemeToken.color`; the
gradients and inset shading are colour-agnostic overlays, so the sphere reads over any colour.
Colour is the only thing distinguishing pieces, so the token catalog uses vivid, separable colours.

**Tokens sharing a space cluster around its centre**, from `getTokenCrowdOffset`: a lone token — much
the commonest case — sits exactly on the space, and a crowd grows outwards around it into a fixed
set of slots. The extent is bounded by that slot table rather than by the crowd size. The offset used
to be `index * step` on both axes, which walked the eighth token at a corner clean off the board, so
with a full table half the pieces ended up outside the grid entirely.

After a roll the token **walks one space at a time** with a tick per step
([useAnimatedTokenPositions](../../src/components/game/hooks/useAnimatedTokenPositions.ts)), each
hop eased fast → slow → fast. Only dice-sized forward hops are walked; a teleport (Go To Jail, a
card advancing you to GO) snaps, because walking it would misrepresent what happened.

**The decision modal waits for the walk.** The hook reports `isMoving` and `GamePage` withholds the
decision until it settles, so the buy prompt never covers a piece still in transit.

_Limitation:_ the engine reports only the final position, so a roll that lands on Chance and is
then moved on by the card animates the net move, not both legs.

### Space card

Every space card renders at one height (`$deed-card-height`, sized to the tallest — a street
with seven rent rows). Railways, utilities, tax, Chance and corners all pad out to match, so the
card never resizes as you move around the board.

### Player card

Cards lead with **net worth** (cash + site and building value) rather than cash, which misleads
when a player is property-rich. Below it: cash, site count with a mortgaged count shown only when
non-zero, **colour-set pips**, and status badges that appear only when they apply (jail card, in
jail, bankrupt). Board position was dropped — a number nobody acts on.

The pips are one swatch per colour group the player holds any of, filled when the set is complete.
Set progress is the strongest strategic signal in Monopoly, so it belongs on the card rather than
only behind a click.

Cards render as a **collapsible stack**: the top card is the active player
(`selectPlayerOrderFromActive`), so order alone conveys whose turn it is and no separate marker is
needed. Clicking a card opens that player's holdings.

**The stack scrolls inside its own box and may claim only `$player-stack-max-share` of the sidebar.**
At eight players an expanded stack is taller than the column; without both of those it overflowed its
flex item and painted straight over the dice and the end-turn button, and squeezed the links below it
into a clipped strip. Two details make it work: `min-height: 0` on the region, because a flex item
otherwise refuses to shrink below its content, and keeping the Collapse button _outside_ the scroll
box so it stays reachable exactly when a long stack needs it. Below `$breakpoint-board` the sidebar
has no definite height, the percentage cap does not apply, and the page scrolls instead — which is
correct for a stacked layout.

### Holdings drawer

[PlayerDetailDrawer](../../src/components/game/overlays/PlayerDetailDrawer.tsx) shows **any**
player's portfolio — holdings are public information on a physical board.

**One holding is featured** as a full `SpaceCard` deed; everything else sits below in a single
stack ([HoldingsStack](../../src/components/game/overlays/HoldingsStack.tsx)) where the cards
overlap so only each title shows, the way a hand of cards fans out. Picking one promotes it to the
featured card. Rendering every deed in full made a large portfolio an unnavigable scroll — at
380px each, twenty sites is 7,600px.

The featured card **stays in the stack**, marked rather than lifted out, so the deck never changes
length and nothing shifts under the pointer as you read through it. The stack stays in colour-group
order (board order, then railways, then utilities) and each card carries its group's colour band,
so the grouping reads without splitting the stack into separate lists.

**The `SpaceCard` is one fixed object.** It carries its own surface — border, background, padding —
and renders at exactly `$deed-card-width` × `$deed-card-height` (340×380) in the title-deed modal,
the buy decision, the featured holding, and a stacked holding alike. Stacked cards are that same
card _clipped_ to `$holdings-peek`, never a smaller card. Callers position it; they never restyle
it, which is what stops the three call sites drifting into three different cards.

**The card opens with its colour strip**, flush to the top edge, above the eyebrow and the name.
That placement is what makes the deck readable: scrolling the stack, the strips alone show which
sites belong to which colour set, so grouping needs no headers. The strip belongs to `SpaceCard`
rather than to `StreetDeed`, because a railway needs one too — railways and utilities have no
colour group and take **ink** (`--text-primary`), the colour railways wear on a real board. Not
`--accent`: it sits within a few points of `--group-red`, so an accent-tinted railway read as a
red street. Every ownable space is labelled _Title deed_; only spaces nobody can own are a _Board
space_.

Stacked cards clamp their name to one line with an ellipsis. The peek is a single title line tall,
so a long name — the railways run to three words — would otherwise be sliced through its second.

The drawer is sized **by** its card rather than guessed at: `.side-drawer.is-wide` is one card wide
plus `$drawer-pad` either side (and its `border-left`), and the card is centred in it. Below
`$breakpoint-mobile` a 420px card cannot fit, so the card goes fluid and the drawer follows.

The height is a fixed `height`, not a `min-height`, so a deed that outgrew it would be clipped
rather than grow — **measure before changing it**: the tallest card is a street (seven rent rows),
at 364px inside the current 380. Two consequences worth knowing: the colour strip needs
`flex-shrink: 0` (it has no content, so under height pressure the flex column collapses it to
nothing and the deed silently loses its colour), and its bleed to the card edges is derived from
`$deed-card-pad` rather than hardcoded. The deed heading is a fixed `1.65rem` rather than a
viewport-relative clamp, because the card is a fixed width — it must size to the card, not to the
window it happens to be shown in.

All the maths behind this — net worth, mortgaged count, set progress, grouping — lives in
[holdings.utils.ts](../../src/domain/rules/holdings.utils.ts) as pure functions. `gameEngine` also
imports `ownsEntireColorSet` from there, so monopoly rent and the UI cannot disagree.

## State and data

Reads `activeGame` and `uiHints` from `game`, and `auctionBidInput` from `ui`. Holds one piece of
local state: the selected space id for the title-deed modal.

## Tests

| Level | File                                                                                     | Covers                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Unit  | [boardLayout.utils.test.ts](../../src/domain/board/boardLayout.utils.test.ts)            | Index → grid cell: corners, uniqueness, edges, wrapping.                                                  |
| Unit  | [gameView.selectors.test.ts](../../src/features/game/gameView.selectors.test.ts)         | The view models every panel receives.                                                                     |
| E2E   | [layout.spec.ts](../../tests/e2e/layout.spec.ts)                                         | Three-column ordering; corner geometry; rail actions present and disabled.                                |
| Unit  | [BoardSpaceCell.test.tsx](../../src/components/game/board/BoardSpaceCell.test.tsx)       | The pieces are SVG, not boxes, and the hotel faces its ribbon's axis.                                     |
| E2E   | [buildings.spec.ts](../../tests/e2e/buildings.spec.ts)                                   | Pieces stand on the ribbon and fit along it; sharp corners with buildings up.                             |
| Unit  | [spaceIcon.registry.test.ts](../../src/components/game/icons/spaceIcon.registry.test.ts) | Every non-street space resolves a glyph; every kind covered; overrides hold their kind.                   |
| E2E   | [board.spec.ts](../../tests/e2e/board.spec.ts)                                           | The icons take theme ink: flipping `data-theme` must move their colour.                                   |
| Unit  | [boardLayout.utils.test.ts](../../src/domain/board/boardLayout.utils.test.ts)            | The Jail regions: jailed inside the cell, visitors on the band, never coinciding, a full table in bounds. |
| Unit  | [JailCorner.test.tsx](../../src/components/game/board/JailCorner.test.tsx)               | The two labels, the whole name still contiguous, and the band width the geometry uses.                    |
| Unit  | [BoardTokenLayer.test.tsx](../../src/components/game/board/BoardTokenLayer.test.tsx)     | Routing on `inJail`, per-region crowd slots, and a jailed player still walking.                           |
| E2E   | [jail.spec.ts](../../tests/e2e/jail.spec.ts)                                             | A jailed player is inside the drawn cell and a visitor is not.                                            |

## Known gaps

- Nothing outstanding. The board cell, turn controls and error banner have their own tests;
  BoardGrid, BoardCenter and BoardTokenLayer stay covered through the page and e2e tests, where
  their layout is the thing under test.
