# Game screen layout

**Status:** Shipped
**Entry points:** [src/features/game/GamePage.tsx](../../src/features/game/GamePage.tsx), [src/styles/pages/\_game.scss](../../src/styles/pages/_game.scss)

## What it does

Arranges the game screen in **two** columns: the board on the left and the player sidebar on the
right, with the dice at the bottom of the sidebar, level with the board's lower edge. On a phone it
becomes a fixed app frame, and on a phone held sideways it goes back to two columns.

## How it works

`.game-layout` is a CSS grid: `minmax(0, 1fr) minmax(320px, 380px)`. The board is square
(`aspect-ratio: 1`) and capped by viewport height (`max-width: calc(100dvh - 72px)`) so it never
grows taller than the window, then centred in its column.

Composition:

| Region   | Component                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board    | [BoardGrid](../../src/components/game/board/BoardGrid.tsx) → `BoardCenter` + 40 × `BoardSpaceCell`                                                                                                         |
| Sidebar  | [GameSidebar](../../src/components/game/layout/GameSidebar.tsx) → `PlayersPanel`, the links row, then the footer                                                                                           |
| Footer   | `.game-side-footer` → [ToastStack](../../src/components/game/overlays/ToastStack.tsx) + [TurnControls](../../src/components/game/panels/TurnControls.tsx) (which holds `DiceDock` and the activity button) |
| Overlays | [GameOverlayLayer](../../src/features/game/GameOverlayLayer.tsx) — drawers, the deed card, the decision modal                                                                                              |

## Responsive behaviour

Three arrangements, from one set of components. Breakpoints are tokens in
[\_tokens.scss](../../src/styles/abstracts/_tokens.scss) and reached through `below()` and
`landscape-compact()` in [\_mixins.scss](../../src/styles/abstracts/_mixins.scss).

| Viewport                                    | Arrangement                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `$breakpoint-board` (1250px) and above      | Two columns, board capped by viewport height, page scrolls if it must.       |
| 1250px down to `$breakpoint-tablet` (720px) | One column; the sidebar's middle becomes a 2-up grid, then 1-up below 720px. |
| Below `$breakpoint-tablet`, portrait        | The **phone frame** — see below.                                             |
| Wide and short (`landscape-compact`)        | Two columns again, board sized by **height**.                                |

### The phone frame

`.app-shell.is-game` becomes a `100dvh` flex column that never scrolls. Inside it the board is
pinned at the top, `.game-side` is the **one** scroll container, and `.game-side-footer` is its
sticky last child holding the toasts and the roll controls.

### Everything on a phone is drawn at phone scale

The layout landed before the sizing did: the structure was right and every
number in it was a desktop number. Measured at 360×740 the player name was a
16px serif on a 124px card, the deed card was 300×360 — _taller than the 336px
board it covers_ — and the gap between a card and the dice was **0px**.

- **Type is one root scale**, `$root-scale-phone` at 87.5%. See
  [design-system.md](../design-system.md#the-phone-tier) for what deliberately
  does not follow it, and for the two traps it sprang (a tap target whose width
  came from its label, and iOS zooming a sub-16px field).
- **The column packs up.** Board → rail → cards sit together and the leftover
  collects above the sticky bar. It used to be shared evenly above and below
  the cards, which was right until the action rail arrived between them: after
  that, halving it put a 72px hole between the rail and the players.
- **The player card is a name and a figure**, at ~47px from 64. The two facts
  are the same two; what went was leading and padding.
- **The deed card is about half the board** — 246×244, from 300×360 — and loses
  nothing: name, price, mortgage value, all seven rent tiers and the building
  cost are all still on it. Below `$breakpoint-mobile` it is already
  `width: 100%; height: auto`, so this is a phone tier and the desktop card's
  exactly-pinned 340×392 never moves. **`width: 100%` is right only where a
  wrapper sets the width** — the holdings drawer and the trade stack do; a
  decision's `1fr` grid track does not, and the same declaration gave 302px
  there against 246 in the title-deed modal. The decisions size the card by
  `max-content` with a 100% ceiling, so it is one object at one width wherever
  a phone shows it, which is what `overlays.spec.ts` already asserts on a
  desktop. Where the height went: the rent rows'
  padding (8px × 7 rows), the "Title deed" eyebrow and the "Rent schedule"
  heading — both labelling something the colour band, the name and the rows
  already say — and a rung off the title. **Hiding the eyebrow moved the stats
  grid up under the 44px close button**, so the title row now reserves a
  tap-target-tall strip beside the name.

### The phone HUD: two columns with the dice between them

Below `$breakpoint-tablet` the player cards stop being a fanned deck and become a grid —
`minmax(0, 1fr) auto minmax(0, 1fr)`, seats down the outside, the dice in the middle. **One DOM
serves both arrangements**, which is the whole design: there is no viewport check in JavaScript
anywhere in it.

Four things make that possible, and each is load-bearing:

- **The middle slot is a `<div>` among `<article>` cards.** The collapsed fan is laid out entirely
  by `:nth-of-type` on `.player-card`, so a sibling of a different element type is invisible to
  every one of those rules. `layout.spec.ts` and `full-table.spec.ts` pin the desktop fan and did
  not change at all.
- **The fan's measurements are custom properties, not tokens read directly** — `--stack-peek`,
  `--stack-strip`, `--stack-tuck`, `--stack-inset`, `--stack-fade`, `--sliver-content`,
  `--sliver-open`. The phone tier turns the whole fan off by redeclaring seven values instead of
  undoing eleven rules. The last two matter most: they are read five classes deep, inside
  `.is-collapsed .player-card:not(:first-of-type) …`, and **a custom property inherits, so the
  reader's specificity is irrelevant.** A media query trying to override those selectors directly
  loses on specificity however late in the file it comes — which it did, twice, before this.
- **The resets go on `.player-stack.is-collapsed`, not `.player-stack`.** The collapsed block
  declares the same variables at 0,2,0, so a 0,1,0 rule in the phone tier loses. The phone stack is
  always collapsed — there is nothing to expand — so that is the selector that governs.
- **`minmax(0, 1fr)`, never `1fr`.** A plain `1fr` has an `auto` minimum, so a 43-character player
  name would push its own track wider and the grid off the screen; the card's ellipsis cannot help
  until the track stops growing.

**The row count comes from the data.** `PlayersPanel` publishes `data-rows` (two cards a row,
rounded up) because the middle column spans every row and `grid-row: 1 / -1` cannot address
implicit ones.

**Order is by seat, not by turn.** DOM order stays turn order — that is what the fan reads, and
what makes its top card the active player — and the grid reorders with CSS `order` from a
`data-seat` attribute, so a player keeps their cell for the whole game instead of jumping every
turn. Whose turn it is is carried explicitly by `.is-active`, which took over the emphasis from
`:first-of-type`: identical on the fan, and the only thing that says it on a grid.

**Whose turn it is is said in that player's own colour, and never as an outline.** Three channels,
because one is not enough: the card's ground is washed with the player's token colour at
`$owner-wash` — the same 14% the board's owned squares use — its identity rail doubles from
`$player-rail` to `$player-rail-active`, and it is the only card that lifts. It also carries
`aria-current`, so the state is not paint alone.

It was a 1px accent border plus a 1px accent ring, which is the treatment the board deleted long
ago: `board-active-outline` came out of the theme contract and `board.spec.ts` fails on any
accent-coloured ring, because a red rectangle around a thing reads as an error rather than as
emphasis. Nothing else was brought along, so the player card, the trade deed and the trade's jail
card each kept a ring of their own — and the player card's was the worst, because at a four-handed
table it outlined the _yellow_ player's card in red while their own yellow sat in the rail an inch
away. A ring in the accent names nobody.

Three channels rather than one because a wash of an arbitrary token colour is not a constant
weight: 14% of yellow over a near-white card is far fainter than 14% of blue, so the rail and the
lift are what carry the state when the colour cannot. `designSystem.guard.test.ts` fails on an
accent-coloured border, outline or ring inside any state selector, and `layout.spec.ts` and
`mobile.spec.ts` check the rendered result on both arrangements.

**The identity rail is a layer, not a border.** The token colour used to be a 5px `border-left`
with the colour set inline — which is why `is-active` had to be saved by that inline style, since
`border-color` sets all four sides and the state was one declaration away from painting over whose
card it was. `PlayerCard` publishes `--player-color` and the stylesheet draws
`.player-card-strip` over the leading padding, so state can change its weight without moving the
text. That span was already in the DOM with a colour on it and **no rule anywhere**, so it rendered
as a zero-width inline nothing.

Removing it from normal flow cost a pixel and the tap-floor sweep caught it the same run: a grid
turns a stray inline child into an anonymous row, and the `row-gap` beneath it was the whole of the
margin by which the card cleared 44px. The phone card's `min-height` is derived from `$control-tap`
plus two hairlines now — the whole card is the tap target, and `inset: 0` resolves against the
padding box. It has to stay phone-only: a sliver in the desktop fan is `max-height: 15px`, and a
min-height beats a max-height outright.

**The card is a name and one figure.** At ~115px wide there is room for nothing else, so net worth,
the owned count and the colour-set pips come off and cash stays. Every one of them is in the
holdings drawer the whole card opens, and `mobile.spec.ts` asserts they are actually there rather
than only that the card is small. The badges stay in the DOM as absolutely-positioned corner
markers — jail and bankruptcy still have to read, and they must not cost the card a line.

**The dice are drawn twice and rolled once.** `DicePair` is mounted in the dock and in the middle
column, and the stylesheet shows one; `GameSidebar` owns the single `useDiceRoller` and hands the
result to both. That is not a refinement — **the hook plays the roll sound**, so a second call
sounds every throw twice. The two mounts also need separate test ids (`die-face-*` and
`die-face-hud-*`): two elements answering one id is a Playwright strict-mode failure even when one
of them is `display: none`. The Roll button stays in the bar on every viewport, because
`controls.spec.ts` requires every control in that row to be exactly 44px tall and a ~90px column
cannot hold one with a real label.

**Landscape puts it all back.** The `landscape-compact` block restores a single column, hides the
middle slot and shows the dock's dice again — and it must stay **after** the portrait block,
because a 667×375 phone matches both.

- **The board is capped by height as well as width** (`max-width: min(100%, 54dvh)`). This is the
  bug the frame fixes: below `$breakpoint-board` the height term used to be _replaced_ by a plain
  `min(100%, 820px)` width cap, so a phone held sideways rendered a **776×776 board in a 375px-tall
  window**, with the dice 1082px down a 1162px page.
- **The bar is `position: sticky; bottom: 0`, not fixed.** As the last child of the scroll container
  it sticks to the bottom edge, so nothing has to know its height — a fixed bar plus a guessed
  `padding-bottom` cannot promise that the last player card can be scrolled clear of it.
- **Nothing in the column may shrink** (`.game-side > * { flex: 0 0 auto }`). A flex item shrinks
  before it overflows, so with the player stack's own scroller released the cards were squeezed and
  spilled _out_ of their box over the bar, with `.game-side` reporting
  `scrollHeight === clientHeight` and no scroll to clear them with. At natural height the column is
  genuinely taller than its box, which is the only thing that gives the bar something to stick over.
- **One scroll container, not two nested ones.** `.game-side` regains a definite height inside the
  frame, so `$player-stack-max-share` silently came back and gave the cards their own scrollbar
  inside the sidebar's — two scrollers under one thumb. It is released here.
- **The activity button joins the bar.** It is `position: fixed` bottom-left on a desktop, which on a
  phone landed exactly on top of the turn controls. It is now rendered inside `.turn-controls` (as
  its `leading` slot) and simply goes `position: static` in the frame. Moving it in the DOM changes
  nothing above the breakpoint, because a fixed element ignores where it sits — but note that a
  `transform` or `filter` on `.turn-controls` would trap it.
- **`.game-side-footer` is `display: contents` above the breakpoint**, so the desktop layout is
  untouched: the `margin-top: auto` on `.toast-stack` still pins the pair to the bottom of the
  column exactly as it did before the wrapper existed.

Two traps, both found by measuring rather than by reading:

- **`.page { margin: 0 auto }` shrink-wraps the moment `.app-shell` becomes flex.** `auto` inline
  margins beat `align-self: stretch` on a flex item, so the frame collapsed and the board measured
  **263px wide in a 375px viewport**. The frame resets the margin and sets `width: 100%`.
- **`.game-layout`'s `align-items: start`** shrink-wraps children on the _cross_ axis once the
  layout is `flex-direction: column`, which shrink-wrapped the board too. The frame sets `stretch`.

The phone block must stay **before** the landscape block in `_game.scss`: a small phone held
sideways (667×375) matches both, and the landscape grid has to win.

### The sidebar carries no navigation

Home, Rules, the sound switch and the appearance cycler used to sit in a `.button-row` inside
`.game-side-scroll` — four controls that are not about the game, taking room from the game on the
smallest screens. They are the header's job now ([navigation.md](navigation.md)), which frees a
44px row plus its gap inside the one scroll region a phone has.

- **The frame is measured from what the header leaves.** `.app-shell` publishes
  `--app-header-height` and `--app-frame-height` (`100dvh` minus it), and `.game-side`'s height and
  the board's square cap both read from that instead of the bare `100dvh - 72px` — which is now
  `$shell-frame-reserve`. The board's phone cap became
  `calc(var(--app-frame-height) * 0.54)`: as `54dvh` it was 54% of the _window_, so with a header
  the board kept its old share, squeezed the sidebar and spilled its cards under the sticky bar.
- **`.app-shell.is-game > .app-header { flex: 0 0 auto }`.** The frame is a flex column, so without
  it the header shrinks before the board does — backwards, since the board can lose pixels and a
  48px bar cannot.
- **Landscape overrides the header's margin rather than negating the frame's padding**, and takes
  the shortest of the three heights: 40px out of a 390px window is already a tenth of it, and the
  wordmark is hidden there.

### The sidebar carries no navigation

Home, Rules, the sound switch and the appearance cycler used to sit in a `.button-row` inside
`.game-side-scroll` - four controls that are not about the game, taking room from the game on the
smallest screens. They are the header's job now ([navigation.md](navigation.md)), which frees a 44px
row plus its gap inside the one scroll region a phone has.

- **The frame is measured from what the header leaves.** `.app-shell` publishes
  `--app-header-height` and `--app-frame-height` (`100dvh` minus it), and `.game-side`'s height and
  the board's square cap both read from that instead of the bare `100dvh - 72px` - which is now
  `$shell-frame-reserve`. The board's phone cap became
  `calc(var(--app-frame-height) * 0.54)`: as `54dvh` it was 54% of the _window_, so with a header
  the board kept its old share, squeezed the sidebar and spilled its cards under the sticky bar.
- **`.app-shell.is-game > .app-header { flex: 0 0 auto }`.** The frame is a flex column, so without
  it the header shrinks before the board does - backwards, since the board can lose pixels and a
  48px bar cannot.
- **Landscape overrides the header's margin rather than negating the frame's padding**, and takes
  the shortest of the three heights: 40px out of a 390px window is already a tenth of it, and the
  wordmark is hidden there.

### The player card is four figures, not four rows

The card pairs the name with the headline figure on one line, runs cash and sites inline beneath
it, and is about **88px** tall. It used to be roughly **300px** on a phone.

- **`.player-metrics` no longer borrows the generic two-column grid.** It was in the
  `.field-grid.two, .two-column, .player-metrics` list in
  [\_shell.scss](../../src/styles/layout/_shell.scss), which collapses to a single column below
  `$breakpoint-tablet`. That is right for a form field and wrong for a pair of labelled figures: it
  turned two figures into four stacked rows. The metrics are a `<dl>` of explicit pairs now, so each
  label is tied to its own value rather than to a position in a flat grid.
- **The card is the target and the chevron says so.** `.player-card-open` had **no rules anywhere in
  the stylesheet and no content**, so it rendered as a tiny default browser pill in the corner of
  the card - a control that read as a rendering artefact. It is an `inset: 0` overlay (so the tap is
  the whole card, well past 44px) carrying a visible chevron on a `--button-secondary` ground.
  Collapsed slivers hide it: the stack's own expand overlay owns the click there, and four slivers
  each painting a chevron read as four broken controls stacked on each other.
- **The drawer's four figures stay a 2x2 grid.** Collapsing `.drawer-stats` to one column - which
  this responsive work did at first - produced about 340px of stats before the first deed, in a
  drawer whose whole job is showing deeds. The padding tightens on a phone instead.
- **A collapsed sliver hides its content rather than relying on the clip.** The
  `.player-stack.is-collapsed` block carried a byte-identical duplicate of the base
  `.player-card-worth` rule inside its selector list, so a 15px sliver was being told to lay its
  name out as a flex row; only the `max-height` clip hid the result, and only `.player-metrics`
  said what was meant.

### Landscape is a height query, not a width one

`landscape-compact` is `(max-width: $breakpoint-board) and (max-height: $breakpoint-short) and
(orientation: landscape)`. All three terms are needed: width alone cannot tell a landscape phone
from a small desktop window, and it is the **height** that breaks the board. The board takes
`height: 100%` and derives its width from `aspect-ratio`, so it always fits.

### Every square says what it is and what it costs

Every square carries its **name** and its **price** at every board size, phone included, and shows
**who owns it** in the owner's own colour. It did not use to: below a 520px board the name was
deleted outright, and the price was never drawn on any viewport. That left a street as a colour
ribbon and a 5px dot — with literally nothing identifying it, because streets carry no glyph.

The geometry is what makes it possible. Rows 1 and 11 are `$board-corner-track` (1.7fr) **deep**
while the columns between them are 1fr wide, so a top-row square is roughly **30 × 51px** on a
370px board — and two runs of type fit side by side across those 30px.

- **`.space-text` holds the pair, and its `flex-direction` is `column`** — which is the _block_
  axis, whatever the writing mode. One rule serves all four sides: on the rows it makes two vertical
  columns side by side, on the columns two horizontal lines stacked, and the price always lands
  exactly where a further wrapped line of the name would have gone. `row` is the trap: with
  `vertical-rl` a multi-line name stacks its lines right-to-left, so a row puts the price _before_
  line one and the reader takes the price first.
- **Six squares a board print what they ARE instead.** "Chennai Central Railway Station" wraps to
  four lines at _any_ board size, and four lines plus a price breaks the 5px legibility floor below
  a 347px board. So the four railways and the two utilities swap to the edition's own word —
  `nouns.railway`, and Electric/Water — below `$board-short-name-floor` (420px), which also catches
  the ~370px board a 768px tablet renders. Both names are in the DOM and a container query picks
  one: CSS cannot substitute text, and a JS width check is not how this codebase does layout. See
  [boardNames.utils.ts](../../src/domain/themes/boardNames.utils.ts).
- **One more tier, for one device class.** Below `$board-tight-floor` (300px board) the type drops
  to 4.2px. Measured on the London board at 320×568 — the narrowest device supported — where the
  height cap leaves a 281px board: "The Angel Islington" has 27.8px of run and "Islington" alone is
  30.6px at 5px. No arrangement of the ribbon or the insets closes a 3px gap. The two common phones
  (360 and 375, boards of 320 and 351) stay at the 5px floor.
- **The insets are two tokens, not one.** `$board-inset-short` across the cell's scarce axis, where
  every pixel is a line of type, and `$board-inset-long` along the plentiful one. One inset for both
  spent the scarce axis at the plentiful axis's rate.
- **The Jail band is the one place the old reasoning still holds.** Its visiting strip is 34% of a
  corner — 25 × 13px on a 281px board — and "Just Visiting" needs three lines of 5px type in 21px of
  width. Below the short-name floor its label is clipped the way `.jail-name-joiner` already is:
  visually gone, still in the accessibility tree and in `textContent`.

- **It is a `@container` query on `.board-card`, not a media query**, and the distinction is the
  whole point. The threshold is a fact about the _board_ — how wide a square is — and the board's
  width is not a function of the viewport's. Landscape sizes the board by viewport **height**, so an
  812×375 phone has an 812px-wide window and a 320px board: a viewport-width rule reported "not a
  phone" and left **6.72px** names on a board every bit as small as the portrait one it correctly
  cleared. Found by looking at it in landscape, not by reading the rule.

- **The full name always stays in the DOM**, and the cell's accessible name is an explicit
  `aria-label` on the button ([BoardSpaceCell](../../src/components/game/board/BoardSpaceCell.tsx)),
  so screen readers and role-based queries are untouched by the swap.
- **The clipping scan is no longer vacuous on a phone**, and it must not be allowed to become so
  again. `mobile.spec.ts` sweeps every _visible_ name and price for self-overflow **and** for
  containment in its cell, with vacuity guards on the board width and the element count — a
  `display: none` element reports zero for both `scrollWidth` and `clientWidth`, which is how the
  old assertion passed while proving nothing. The 320px case plays the **London** board, because
  India's longest street is "Bhubaneshwar" and would prove nothing.

- **Board decorations are sized in `cqw`, not `vw`.** `.board-card` is a `container-type:
inline-size` container and publishes a `--token-size` custom property. `vw` tracks the _viewport_,
  which stops agreeing with the board the moment the board is capped by `dvh` — and in landscape the
  board is sized by height, so `vw` tracks nothing it is drawn on. The desktop values are
  deliberately left as the original `vw` clamps, because the board geometry tests are calibrated
  against them and nothing above the phone breakpoint has the problem `cqw` solves.

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

The **owner bar runs the full length of the cell's outer edge**, opposite the ribbon, per side, in
the owner's token colour, and `.is-owned` washes the whole square with `$owner-wash` (14%) of it —
the same token the active player card now washes with, so "this is theirs" looks the same on a
square and on a card. It replaced a 5px
corner dot, which was a quarter of a phone cell and had to be hunted for on each square. It hugs
the outer edge because the dot used to sit top-right on every side — which on the bottom row is
where the ribbon is, so it covered the pieces standing on it. See
[site-ownership.md](site-ownership.md) for the z-index and padding traps.

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

| Level | File                                                                                     | Covers                                                                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit  | [boardLayout.utils.test.ts](../../src/domain/board/boardLayout.utils.test.ts)            | Index → grid cell: corners, uniqueness, edges, wrapping.                                                                                                                   |
| Unit  | [gameView.selectors.test.ts](../../src/features/game/gameView.selectors.test.ts)         | The view models every panel receives.                                                                                                                                      |
| E2E   | [layout.spec.ts](../../tests/e2e/layout.spec.ts)                                         | Two-column ordering; dice docked beside the board; players top, controls bottom. Pins the desktop viewport.                                                                |
| E2E   | [mobile.spec.ts](../../tests/e2e/mobile.spec.ts)                                         | The phone frame and landscape: no page scroll, board and Roll together, the bar clear of the last card, names hidden but addressable, 44px targets, a turn played through. |
| Unit  | [boardTracks.guard.test.ts](../../src/domain/board/boardTracks.guard.test.ts)            | `$board-corner-track` and `CORNER_TRACK` still agree, so no token drifts off its square.                                                                                   |
| Unit  | [GameSidebar.test.tsx](../../src/components/game/layout/GameSidebar.test.tsx)            | The footer groups toasts above the dice, and the activity button sits in the control row.                                                                                  |
| Unit  | [PlayerCard.test.tsx](../../src/components/game/panels/PlayerCard.test.tsx)              | Each metric label is paired with its own figure; the holdings control carries a visible mark.                                                                              |
| Unit  | [BoardSpaceCell.test.tsx](../../src/components/game/board/BoardSpaceCell.test.tsx)       | The pieces are SVG, not boxes, and the hotel faces its ribbon's axis.                                                                                                      |
| E2E   | [buildings.spec.ts](../../tests/e2e/buildings.spec.ts)                                   | Pieces stand on the ribbon and fit along it; sharp corners with buildings up.                                                                                              |
| Unit  | [spaceIcon.registry.test.ts](../../src/components/game/icons/spaceIcon.registry.test.ts) | Every non-street space resolves a glyph; every kind covered; overrides hold their kind.                                                                                    |
| E2E   | [board.spec.ts](../../tests/e2e/board.spec.ts)                                           | The icons take theme ink: flipping `data-theme` must move their colour.                                                                                                    |
| Unit  | [boardLayout.utils.test.ts](../../src/domain/board/boardLayout.utils.test.ts)            | The Jail regions: jailed inside the cell, visitors on the band, never coinciding, a full table in bounds.                                                                  |
| Unit  | [JailCorner.test.tsx](../../src/components/game/board/JailCorner.test.tsx)               | The two labels, the whole name still contiguous, and the band width the geometry uses.                                                                                     |
| Unit  | [BoardTokenLayer.test.tsx](../../src/components/game/board/BoardTokenLayer.test.tsx)     | Routing on `inJail`, per-region crowd slots, and a jailed player still walking.                                                                                            |
| E2E   | [jail.spec.ts](../../tests/e2e/jail.spec.ts)                                             | A jailed player is inside the drawn cell and a visitor is not.                                                                                                             |
| E2E   | [board.spec.ts](../../tests/e2e/board.spec.ts)                                           | Tinted stock and a distinct field; the grain overlay is inert to clicks.                                                                                                   |
| E2E   | [board.spec.ts](../../tests/e2e/board.spec.ts)                                           | **Every board colour follows the theme**: flip `data-theme` and none may stay put.                                                                                         |

## Known gaps

- Nothing outstanding. The board cell, turn controls and error banner have their own tests;
  BoardGrid, BoardCenter and BoardTokenLayer stay covered through the page and e2e tests, where
  their layout is the thing under test.
