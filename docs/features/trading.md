# Trading

**Status:** Shipped
**Entry points:** [`TradeBuilder.tsx`](../../src/components/game/trade/TradeBuilder.tsx) ·
[`TradeDeedStack.tsx`](../../src/components/game/trade/TradeDeedStack.tsx) ·
[`TradeResponseDecision.tsx`](../../src/components/game/panels/decisions/TradeResponseDecision.tsx) ·
[`trade.utils.ts`](../../src/domain/rules/trade.utils.ts)

## What it does

Property only moves between players through a trade. One player assembles an offer — sites, cash and
Get Out of Jail Free cards on either side — and the other accepts or rejects it. The engine settles
it in one command, including the interest the receiver owes the bank on any mortgaged site.

**Both screens are made of real title deeds.** Each side of the deal is that player's holdings as a
stack of the same `SpaceCard` the board, the site panel and the holdings drawer use; picking one
expands it from a peek to the full card. So the deal being assembled is literally a set of deeds, and
everything not in it is still a readable peek with its colour band, name and mortgage stamp.

## How it works

```
site panel → "Propose trade" → overlays.openTrade(ownerId)
  → selectTradeBuilder(game, findToken, recipientId)   features/game/gameView.selectors.ts
      → getTradableSites(game, playerId)               domain/rules/trade.utils.ts
        { spaceId, space, ownership, blockedReason }
  → TradeBuilder
      → TradeDeedStack   × 2   the deeds, picked from
      → TradeJailCards   × 2   the cards themselves
  → onPropose(TradeState) → runGameCommand(proposeTrade)

recipient: pendingDecision 'trade-response'
  → selectDecisionViewModel → TradeSideSummary { cash, sites: HoldingEntry[], jailCards }
  → TradeResponseDecision   the same deeds, read-only, plus keep-or-redeem per mortgaged site
  → acceptTrade / rejectTrade
```

## Key decisions

- **Two columns, not a wizard.** A trade is only ever judged as a whole — what you give against what
  you get — so hiding one side while you pick the other works against the decision.

- **The deeds are stacked, not laid out.** A deed is 340×380 and a player can hold up to 28 of them.
  The holdings drawer had already solved that: clip each card to a peek (`$holdings-peek`) and tuck
  it under the one above (`$holdings-tuck`). Selecting expands it to full size, which is what makes
  the assembled deal read as deeds rather than as a list.

- **`TradeDeedStack` is deliberately not `HoldingsStack`.** That one promotes exactly one card and
  selects nothing; this one has many selected at once, a disabled state and a reason banner. They
  share the peek and tuck tokens, and each names the other, so a change to the shape of the idea is
  made in both.

- **`TradableSite` carries the whole space and its ownership**, not a name and a `mortgaged` flag.
  The builder draws the real deed from it, so it needs everything the deed shows. The same reason
  took `TradeSideSummary.siteNames: string[]` to `sites: HoldingEntry[]` — that is the screen where a
  player _commits_, and it showed bare names: no colour group, no price, no rent, no buildings, no
  mortgage.

- **A blocked site says why on the card.** `tradeBlockedReason` already states the rule once (you
  cannot trade a site while its colour group holds buildings) and the engine throws from the same
  function; the reason used to sit in a `title` attribute nobody hovers.

- **Jail cards are shown as cards, and selection is "the first N".** Each wears its deck's colour,
  because that is the one way two of them differ — a Chance card has to go back to Chance. The engine
  moves `jailFreeCards.slice(0, N)`
  ([tradeSettlement.utils.ts](../../src/domain/rules/engine/tradeSettlement.utils.ts)), so clicking
  the Nth card puts exactly those N in. A per-card checkbox would let a player pick the second and
  keep the first, which the engine cannot honour.

- **The builder offers no opinion on whether a deal is fair.** Any price both players agree on is
  legal, and that is the one rule this screen must not get in the way of. It refuses only an offer
  that moves nothing at all.

## State and data

Reads `GameState.ownership`, `.players` and `.board`; writes `GameState.tradeState` through
`proposeTrade`, and the settlement through `acceptTrade`. The builder's own selection is local
component state — the modal discards on close, so there is nothing to keep in the store.

## Tests

| Level       | File                                                                                                        | Covers                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Unit        | [trade.utils.test.ts](../../src/domain/rules/trade.utils.test.ts)                                           | Blocked reasons, transfer fees, and the deeds `getTradableSites` returns.                   |
| Unit        | [TradeBuilder.test.tsx](../../src/components/game/trade/TradeBuilder.test.tsx)                              | Picking, expanding, blocked sites, and the first-N jail card rule.                          |
| Unit        | [TradeResponseDecision.test.tsx](../../src/components/game/panels/decisions/TradeResponseDecision.test.tsx) | The deal as deeds, and keep-or-redeem per mortgaged site.                                   |
| Integration | [gameSlice.integration.test.ts](../../src/features/game/gameSlice.integration.test.ts)                      | Propose and accept through the store and localStorage.                                      |
| E2E         | [trade.spec.ts](../../tests/e2e/trade.spec.ts)                                                              | The whole journey, the stamp in the peek, expansion, a blocked site, and the accept screen. |

## Known gaps

- **No counter-offer.** The recipient accepts or rejects; they cannot amend and send back.
- **No fairness hint.** Deliberate — see above — but a running total of each side's book value would
  inform without judging.
