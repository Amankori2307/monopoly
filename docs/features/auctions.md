# Auctions

**Status:** Shipped
**Entry points:** [`AuctionDecision.tsx`](../../src/components/game/panels/decisions/AuctionDecision.tsx) ·
[`auctionViewModel.selectors.ts`](../../src/features/game/auctionViewModel.selectors.ts) ·
[`auction.utils.ts`](../../src/domain/rules/engine/auction.utils.ts) ·
[`auctionBids.utils.ts`](../../src/domain/rules/auctionBids.utils.ts)

## What it does

An auction is the bank's forced sale, and it happens in three situations: a player declines an
unowned property they landed on, a bankruptcy hands a whole portfolio back to the bank, or the bank
runs short of houses and more than one player could use the last one. One loop serves all three;
only the eligible bidders, the opening price and what the winner receives differ.

The panel a bidder sees is two columns. **Left: the title deed** — rents, mortgage value, build
costs — because the modal covers the board, so this is the only way to judge what a site is worth.
**Right: the auction as a chat log**, then the bid. The log reads top to bottom — _Auction started at
₹10 · Asha bid ₹20 · Vikram bid ₹50 · Asha passed · Vikram bidding…_ — and its last line is the live
one, which is also the only place the panel says whose turn it is.

**The panel is exactly one deed card tall and never grows.** It used to stretch with the ledger, so
the modal moved every time somebody bid and the buttons walked down the screen. Everything on the
right is a fixed row except the ledger, which takes whatever height is left and scrolls.

## How it works

```
decline / bankruptcy / building shortage
  → startAuction(state, spaceId, building?)            domain/rules/engine/auction.utils.ts
      seeds auctionState + its ledger's opening line
  → pendingDecision = { type: 'auction-bid', auctionId }

UI: selectDecisionViewModel(game, findToken)           features/game/decisionViewModel.selectors.ts
  → selectAuctionDecision(game, findToken)             features/game/auctionViewModel.selectors.ts
      resolves the log's player ids to names + tokens, and names the live bidder
  → AuctionDecision → AuctionLedger (the log) / AuctionBidForm

bid:  runGameCommand({ type: 'submitAuctionBid', amount: bidField.amount })
  → bidBlockedReason throws if illegal, else appends a ledger line and advances the bidder
pass: runGameCommand({ type: 'passAuction' })
  → appends a pass line; once one bidder is left, completeAuctionIfPossible settles
```

`nextActiveBidderIndex` is what stops a player who has passed being asked again — advancing by one
and wrapping is not enough, because bidding advances the index too, so a bid/pass interleave could
land the turn back on someone who had already left and let them bid their way back in.

## Key decisions

- **The bidding is recorded as state, not read back out of the game log.** `AuctionState.ledger`
  holds every bid and pass, oldest first, with the opening line first. It cannot be derived: the
  rest of the auction keeps only the standing high bid and who has left, and `GameState.history` is
  prose without a player id, shared with every other event, and capped at 120. Structured rather
  than prose because the panel names each bidder and wears their colour.

- **The win is not in the panel.** The modal closes the instant the last opponent passes, and the
  result is said by the toast and the Activity log — `resolveBankPayment` logs it, as it logs every
  other payment. An acknowledge step would put an extra click on every auction, including each site
  of a bankruptcy's queue, to show something the game already says.

- **The bid field is derived, not stored.** It arrives holding the minimum legal bid. Before this it
  was a bare number in `uiSlice` starting at 10 and never touched again, so once the high bid passed
  10 the player had to guess a legal number and was shown an error banner for getting it wrong.
  What the slice now holds is a _keyed_ entry — the auction, the bidder and the standing high bid —
  and `selectBidField` uses it only while its key still matches. So a typed amount goes stale by
  itself the moment anything moves: no `useEffect`, nothing to reset between the queued auctions of
  a bankruptcy.

- **The legality of a bid is stated once**, in `bidBlockedReason`
  ([auctionBids.utils.ts](../../src/domain/rules/auctionBids.utils.ts)). The engine throws from it
  and the panel disables Submit from it, so the button and the rule cannot drift — the same
  arrangement `buildBlockedReason` has with the site panel. The panel refusing the bid is why the
  error banner no longer appears for a mistyped amount.

- **A building auction shows the site's deed anyway.** It carries the `spaceId` of the site whose
  build request triggered it, which is what set the opening price, so the left column is never
  empty — the copy says a house or hotel is what is for sale.

- **The log is plain lines, not cards.** It started out as a bordered box per entry with a bidder
  roster of coloured chips above it, and the boxes and chips were saying nothing the sentences did
  not. A log people read top to bottom is the right shape for "how did the bidding get here", and it
  scales to eight players without taking four rows of chips out of its own height.

- **The log stays pinned to its newest line.** The panel is a fixed height, so a long auction
  scrolls - and left at the top it showed an opening bid of ₹10 while the standing bid was ₹120.
  The newest bid is the one a player is answering, so `AuctionLedger` scrolls to the bottom
  whenever a line lands.

- **Nothing is said twice.** There is no heading on the right (the card names the space in bigger
  type a few pixels away), no bidder roster (the log's own lines say who bid and who passed), no
  banner or field label naming the bidder (the log's last line does), and no "leading ₹120"
  anywhere (the newest bid line and the form's "Minimum" both already say it). Every one of those
  existed at some point and every one came out of the log's height, which is fixed.

- **`AuctionBidderViewModel` is deliberately just identity and cash** — no `isActive`, no
  `hasPassed`. Both existed for the roster, and a field nothing renders is the drift this repo tries
  to avoid.

## State and data

| Reads/writes                        | Where                                                    |
| ----------------------------------- | -------------------------------------------------------- |
| `GameState.auctionState`, `.ledger` | persisted — `GAME_STATE_VERSION` 6, `auctionStateSchema` |
| `GameState.pendingAuctionSpaceIds`  | the queue behind a bankruptcy's portfolio                |
| `GameState.pendingDecision`         | `{ type: 'auction-bid', auctionId }`                     |
| `ui.auctionBidInput`                | ephemeral, never persisted — a `{ key, amount }` or null |

Adding `ledger` is what took the save format to version 6. `v5ToV6` gives an in-flight auction its
opening line and nothing more: the old shape never recorded the sequence, so a save caught
mid-auction cannot have its bidding reconstructed.

## Tests

| Level       | File                                                                                             | Covers                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Unit        | [auctionBids.utils.test.ts](../../src/domain/rules/auctionBids.utils.test.ts)                    | The minimum bid, and every reason a bid is refused.                                         |
| Unit        | [gameEngine.test.ts](../../src/domain/rules/gameEngine.test.ts)                                  | Bidder rotation, and the ledger: opening line, bids, passes, a refused bid leaving no mark. |
| Unit        | [AuctionDecision.test.tsx](../../src/components/game/panels/decisions/AuctionDecision.test.tsx)  | The deed, the log in order, the live line, the prefill, the chips, Submit disabled.         |
| Unit        | [auctionViewModel.selectors.test.ts](../../src/features/game/auctionViewModel.selectors.test.ts) | The resolved log, the live bidder, and every way a typed bid goes stale.                    |
| Integration | [gameSlice.integration.test.ts](../../src/features/game/gameSlice.integration.test.ts)           | Bids and passes reaching `localStorage`, and reloading mid-auction.                         |
| E2E         | [auction.spec.ts](../../tests/e2e/auction.spec.ts)                                               | The whole journey: decline, bid, pass, prefill, refusal, the win toast, and mobile.         |

## Known gaps

- **No timer.** A bidder can sit on their turn for ever. The printed game has no clock either, but a
  hotseat game would benefit from one.
- **No bid history across auctions.** Each auction's ledger dies with it, which is why the win line
  lives in the game log. A player who wants the whole story reads the Activity drawer.
