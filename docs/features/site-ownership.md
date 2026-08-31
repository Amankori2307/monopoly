# Site ownership

**Status:** Shipped for display. The owner's actions land with phase 2.
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

- **Phase-2 actions are rendered disabled with a reason, not hidden.** The panel should say what
  will be possible, which is how the action rail already behaves. When the engine commands land,
  deleting entries from `SCAFFOLDED_COMMANDS` lights up both with no UI change.

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

## State and data

Reads `GameState.ownership` and `GameState.players`. Writes nothing — every action it offers is
still scaffolded. `isOwnedBy` was made public in `holdings.utils.ts`.

## Tests

| Level | File                                                                              | Covers                                                                                   |
| ----- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Unit  | [playerActions.utils.test.ts](../../src/domain/rules/playerActions.utils.test.ts) | `getSiteActions` for unowned, opponent-owned, owner-owned, non-ownable, unknown id       |
| Unit  | [SpaceDetailCard.test.tsx](../../src/components/game/SpaceDetailCard.test.tsx)    | all three states, the mortgaged stamp, the picked space reaching the command             |
| Unit  | [PlayerBadges.test.tsx](../../src/components/game/panels/PlayerBadges.test.tsx)   | the mortgaged badge and its pluralisation                                                |
| E2E   | [feedback.spec.ts](../../tests/e2e/feedback.spec.ts)                              | owner dots in two colours, hollow when mortgaged, the three panel states, the deed stamp |

## Known gaps

- Every owner action is disabled: mortgage, build, sell, and trade are all phase 2.
- Houses and hotels are not drawn on the board — `buildLevel` is never written yet.
- The action rail remains dead. Once the commands land, the rail and this panel overlap and one of
  them should probably go.
