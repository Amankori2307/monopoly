# Site ownership

**Status:** Shipped. Mortgage and redeem work; build, sell and trade are still pending.
**Entry points:** [src/features/game/sitePanel.utils.ts](../../src/features/game/sitePanel.utils.ts), [src/components/game/SpaceDetailCard.tsx](../../src/components/game/SpaceDetailCard.tsx), [src/features/game/boardOwnership.utils.ts](../../src/features/game/boardOwnership.utils.ts)

## What it does

The board shows who owns what, mortgaged sites read as mortgaged, and clicking a site tells you
where you stand: unowned, yours, or someone else's.

`GameState.ownership` had been populated by the engine since the rewrite and **read by no view
except aggregate counts** — the board could not tell you who owned a square, and a mortgaged deed
looked identical to an unmortgaged one everywhere it appeared.

## How it works

### On the board

`GamePage` derives a marker map and passes it down; `BoardSpaceCell` stays presentational.

```
selectSpaceOwnerMarks(game, findToken)     boardOwnership.utils
  → Record<SpaceId, SpaceOwnerMark>        { color, mortgaged, ownerName }
  → <BoardGrid ownerMarks={...} />
  → <BoardSpaceCell ownerMark={...} />     a corner dot, hollow when mortgaged
```

The dot's colour is an **inline style**, the sanctioned exception to "never hardcode a colour":
token colours are theme data, not CSS tokens, exactly as in `BoardTokenLayer` and `PlayerCard`.
The owner's name also goes into the cell's accessible label.

### In the panel

`selectSitePanel` resolves ownership once into a `SitePanelViewModel`, and the panel branches:

| State          | Shows                                                     |
| -------------- | --------------------------------------------------------- |
| Unowned        | the deed alone — no action block at all                   |
| Yours          | "You own this site" plus Build / Sell / Mortgage / Redeem |
| Someone else's | "Owned by _Name_" in their colour, plus Offer a deal      |

`getSiteActions(state, spaceId, playerId)` is the space-scoped counterpart to the rail's
`getPropertyActions`. **This panel is the property picker whose absence is the documented reason
the action rail is dead** — every property command needs a `spaceId`, and until now nothing in the
UI supplied one.

## Key decisions

- **Actions not yet built are rendered disabled with a reason, not hidden.** The panel says what will
  be possible, which is how the action rail already behaves. Deleting an entry from
  `SCAFFOLDED_COMMANDS` lights it up with no UI change — that is exactly how mortgage and redeem
  went live, and `siteActionBlockedReason` then took over saying _why_ each one is unavailable
  (already mortgaged, not mortgaged, buildings in the colour set, not enough cash to redeem).

- **The action block sits beside the deed, not inside it.** `SpaceCard` has an `actions` slot, but
  a deed is a fixed height with `overflow: hidden`, so anything appended inside is clipped — this
  was caught in the browser, not by a test. `BuyOrAuctionDecision` keeps its buttons out of the
  card for the same reason, and the prop now documents the constraint.

- **Mortgage state is on `SpaceCard`, not on each caller.** One optional `ownership` prop covers
  the deed modal, the buy decision, the featured holding, and every card in the holdings deck.

- **The mortgaged count on the player card became a badge and stopped being text.** `PlayerBadges`
  already existed and is data-driven; keeping both would have said the same thing twice on one card.

- **A mortgaged dot is hollow rather than a second colour.** It still has to identify the owner, so
  the colour is spent on that; hollow carries "collects no rent".

- **A mortgaged site is struck with a rubber stamp** —
  [MortgageStamp](../../src/components/game/deed/MortgageStamp.tsx), inline SVG at low opacity, on
  the board square and on the deed. A _watermark_, deliberately: the space name and the whole rent
  schedule read straight through it. Mortgaging is one of the most consequential states in the game
  and it used to be carried by a 7px hollow dot and a small dashed pill above the deed's title -
  neither of which anyone notices. The pill is gone; the stamp says it once, and the accessible name
  rides on the stamp.

- **The board stamp carries the word too, along the square's long axis.** It did not at first, on the
  argument that a ~52x89px square could not hold it - an argument made against the cell's _short_
  axis and with a bad character advance. DM Mono advances about 0.6em, so the word at 9px is roughly
  54px inside a ~70px axis: it fits, and the frame alone read as a stray rectangle rather than as
  "mortgaged".

- **The two board orientations are two viewBoxes, not one plus a CSS rotation.** A square is portrait
  on the top and bottom rows and landscape on the sides, and the word has to follow the long axis. A
  CSS rotation happens after layout, so `width: 128%` still resolved against the short side and the
  word came out at half the length it had room for. The rotation is baked into each viewBox instead,
  and the portrait sides size off `height`.

- **Both square variants share one class.** The class was interpolated from the variant, which
  silently produced `is-space-tall` and matched none of the `.is-space` rules - so the stamp rendered
  fully opaque and swamped the space name. Only a measurement caught that; the screenshot merely
  looked "a bit heavy". A test pins the class now.

- **The word comes off below the tablet breakpoint.** At about 29x49px it cannot be read at any
  weight, and the hollow owner dot carries the state there - which is why the dot stays.

- **The stamp takes `--action-mortgage`**, the token the mortgage button already uses, so it needs no
  new theme token and reads in both themes. Colour comes through `currentColor` and opacity from CSS,
  so both are tunable in one place.

- **`useId` gives each deed stamp its own filter id.** The drawer shows a featured deed with the
  stack behind it, so two stamps are on screen at once; a hard-coded id would collide and one would
  render unfiltered.

- **The holdings drawer used to show no mortgage state at all.** It rendered every deed without
  passing `ownership`, so a player browsing their own portfolio - the one place they would go to
  check - saw mortgaged sites as though they were clear. The drawer now takes the game's `ownership`
  map: `HoldingsSection.spaces` is `OwnableSpace[]` and carries none.

## State and data

Reads `GameState.ownership` and `GameState.players`. Its four actions dispatch real commands:
mortgage, redeem, build and sell. Build and Sell each cover two commands — the button becomes
`buildHotel` / `sellHotel` once the site is at four houses or holds a hotel, so one control follows
the whole ladder. `isOwnedBy` was made public in `holdings.utils.ts`.

## Tests

| Level | File                                                                              | Covers                                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit  | [playerActions.utils.test.ts](../../src/domain/rules/playerActions.utils.test.ts) | `getSiteActions` for unowned, opponent-owned, owner-owned, non-ownable, unknown id                                                                                |
| Unit  | [SpaceDetailCard.test.tsx](../../src/components/game/SpaceDetailCard.test.tsx)    | all three states, the mortgaged stamp, the picked space reaching the command                                                                                      |
| Unit  | [PlayerBadges.test.tsx](../../src/components/game/panels/PlayerBadges.test.tsx)   | the mortgaged badge and its pluralisation                                                                                                                         |
| E2E   | [feedback.spec.ts](../../tests/e2e/feedback.spec.ts)                              | owner dots in two colours, hollow when mortgaged, the three panel states, the deed stamp                                                                          |
| E2E   | [buildings.spec.ts](../../tests/e2e/buildings.spec.ts)                            | building and selling from the panel, the even rules, the pieces standing on the ribbon and fitting along it, and the sharp-corner scan run with buildings present |

## Known gaps

- Nothing here is disabled any more. Mortgage, redeem, build, sell and "Offer a deal" all work; a
  disabled control now always means a rule refusing it, with the reason in its tooltip.

## Resolved

- **The action rail is gone.** It offered the same four actions from the left column with no space to
  act on — every property command needs a `spaceId`, and this panel is the only place one exists.
  The board is a two-column layout now.
- **Buildings stand on the board as real pieces**, along the site's colour ribbon: up to four gabled
  houses, or one hotel with lit windows. `BuildingPips` in `BoardSpaceCell.tsx` picks them,
  `BuildingPiece.tsx` draws them, and the levels ride on `SpaceOwnerMark` so the cell stays
  presentational.

  They are **inline SVG, not styled boxes and not `clip-path`**. A box cannot carry a pitched roof,
  and the roof is what says "house" at eight pixels; a clip cuts the silhouette but takes the
  outline with it — both the border and any box-shadow — and that dark edge is the only thing
  keeping a green house legible on a green ribbon. Drawing also sidesteps the sharp-corner system
  entirely, because an SVG's own geometry is not a `border-radius`.

  The **hotel is a second drawing per axis, never a rotation** — a rotation happens after layout and
  would lay the roof on its side, the same reason `MortgageStamp` picks its box per variant. Houses
  are never turned at all: a rotated word still reads, a rotated house reads as a broken shape.

  The **ribbon was deliberately not thickened** to give them more room. The width it would take
  comes off `.space-label` on exactly the axis the name-clipping e2e test measures, and the longest
  street names have no margin left. A cramped house is cosmetic; a clipped name is a failure.

- **The owner dot hugs the cell's outer edge**, the opposite one to the ribbon, per side. It used to
  sit top-right on every side — which on the bottom row is where the ribbon is, so it covered the
  pieces standing on it. With 6px pips that was a nibble; with real houses it hid the fourth one and
  a hotel's windows outright.
- **The deed marks the rent tier it is actually charging.** A bare site marks nothing: which of the
  two unbuilt rents applies depends on whether the owner holds the rest of the set, which the deed
  cannot see.
