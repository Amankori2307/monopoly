# Monopoly India Edition — Ruleset

Last updated: August 31, 2026

The complete ruleset this app implements or intends to implement, with the **implementation status
of every rule** and the **edge cases** that are easy to get wrong. Where the engine diverges from
the rule, that is stated rather than glossed.

> **Money amounts are never literals in code.** They live in
> [game.constants.ts](../src/domain/constants/game.constants.ts) and
> [board.constants.ts](../src/domain/constants/board.constants.ts); the symbol is
> `ThemeConfig.currencySymbol` (`₹` here) via `formatMoney`. Amounts in this document are the
> constants' current values.

**Status key:** ✅ implemented · ⚠️ partly implemented, see note · ❌ not implemented

---

## Quick answers

The questions that actually come up, answered directly. Detail in the numbered sections.

### How many times can I roll in one turn?

**At most three — and they are separate rolls, not three dice thrown together.** You roll, move, and
resolve that space completely before rolling again.

| ID   | Roll | Doubles                                                                                           | Not doubles              |
| ---- | ---- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| Q1.1 | 1    | Move, resolve the space, roll again                                                               | Move, resolve, turn ends |
| Q1.2 | 2    | Move, resolve the space, roll again                                                               | Move, resolve, turn ends |
| Q1.3 | 3    | **Straight to Jail, and this roll is discarded** — no movement, no space to resolve, no GO salary | Move, resolve, turn ends |

**The first two rolls still count.** Going to Jail on the third does not undo them: a site bought on
roll one is still yours, rent paid on roll two stays paid, a card drawn still applied. You end the
turn in Jail having done all of it. Pinned by a test that buys a property on roll two and asserts it
is still owned after roll three jails the player.

### I rolled a double and landed in Jail. Do I roll again?

**No. Your turn ends immediately** and the extra roll is forfeited. That holds for all three routes
into Jail: landing on Go To Jail, drawing a card, or rolling the third double. The engine needs an
explicit `inJail` guard for this, because the phase logic would otherwise hand the extra roll back —
covered by a regression test.

### How many rolls do I get while in Jail?

**One per turn, and up to three turns.** The "three" is three _turns_, not three rolls in one turn.

| ID   | Jail turn | Doubles                                                                | Fails                                                |
| ---- | --------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| Q2.1 | 1         | Leave, move by that roll, **turn ends** — no bonus roll for the double | Stay in Jail, turn ends                              |
| Q2.2 | 2         | Same                                                                   | Stay in Jail, turn ends                              |
| Q2.3 | 3         | Same                                                                   | **Must** pay ₹50 and move using that same third roll |

Doubles rolled in Jail do **not** count toward the three-doubles-to-Jail rule; the counter resets.
Leaving by fine or card means you then roll normally, and doubles there _do_ grant an extra roll.

### Can I sell a site I own?

| ID   | Route                           | Allowed                                                                          |
| ---- | ------------------------------- | -------------------------------------------------------------------------------- |
| Q3.1 | Sell to the bank                | **Never.** The bank does not buy property back                                   |
| Q3.2 | Auction it myself               | **No.** An auction only happens when a player _declines_ an **unowned** property |
| Q3.3 | Sell or trade to another player | **Yes**, at any price you both agree                                             |
| Q3.4 | Trade a **mortgaged** site      | **Yes** — the new owner pays it off, or pays 10% to keep it mortgaged            |
| Q3.5 | Trade a **built** site          | **No** — sell every building in its colour group to the bank first               |

### Can I mortgage a site with houses on it?

**No.** Sell every building in that colour group back to the bank first. The same restriction blocks
trading it.

### When can I build, sell buildings, or mortgage?

The printed rule allows all of it **at any time**, including during another player's turn — that is
how you raise cash when rent is demanded of you. This app deliberately offers them in safe UI
windows instead, because a turn-based interface cannot model interrupting someone else's roll. See
section 2.

### What do buildings sell for?

**Half** what you paid, **to the bank only** — never to another player. Selling must be even, the
same one-house rule as building, in reverse.

---

## 1. Source precedence

1. User product requirements
2. Uploaded Monopoly India Edition booklet and board images
3. Official Monopoly rules for anything the above leave open

## 2. Locked digital adaptations

Deliberate departures from the printed game, not omissions:

| ID  | Adaptation                                                                 | Why                                                                             |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 2.1 | Rent is auto-collected when owed                                           | No banker to police it; forgetting to ask is not a skill                        |
| 2.2 | Building and trading are offered in safe UI windows, not interrupt-anytime | A turn-based UI has no way to model "interrupt during someone else's roll"      |
| 2.3 | Auction opens at ₹10 with a minimum increment of ₹1                        | The printed game has no opening bid; a digital auction needs a floor and a step |
| 2.4 | Free Parking pays nothing                                                  | The official rule. The jackpot is a house rule                                  |
| 2.5 | Income Tax is a flat ₹200                                                  | The "pay 10% of total worth" option is dropped; net worth mid-turn is ambiguous |

---

## 3. Setup

| ID  | Rule                                                                                                                                                                                                           | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 3.1 | 2–8 players (`MIN_PLAYERS`, `MAX_PLAYERS`)                                                                                                                                                                     | ✅     |
| 3.2 | Each player starts with ₹1500 (`STARTING_CASH`)                                                                                                                                                                | ✅     |
| 3.3 | Each player picks a token from the theme's catalogue                                                                                                                                                           | ✅     |
| 3.4 | All tokens start on GO                                                                                                                                                                                         | ✅     |
| 3.5 | Both decks shuffled once at creation                                                                                                                                                                           | ✅     |
| 3.6 | The highest opening throw takes the first turn, a tie re-rolled among only the tied players; play then passes to the left, so the order is the entry order rotated onto the starter (`chooseFirstPlayerOrder`) | ✅     |
| 3.7 | Speed Die game: every player gets an extra ₹1000 (`SPEED_DIE_BONUS_CASH`)                                                                                                                                      | ✅     |

---

## 4. The turn sequence

```
await_roll → resolving_movement → resolving_space → await_decision
           → await_extra_roll_or_end → turn_complete
```

1. Roll two dice, move that many spaces clockwise. ✅
2. Passing or landing on GO pays ₹200 (`PASS_GO_AMOUNT`). ✅
3. Resolve the space landed on (below). ✅
4. If the roll was doubles and the player is not in Jail, roll again. ✅
5. Otherwise the turn ends. ✅

`resolving_space` is declared in `TurnPhase` but never assigned — space resolution happens
synchronously inside `resolving_movement`.

---

## 5. Doubles — every case

**A turn is at most three rolls, taken one at a time.** You roll, move, and resolve the space
completely before rolling again — a double grants one more roll, and the third consecutive double
sends you to Jail instead of being played. **Rolls already taken are never undone**: their purchases,
rent and card effects all stand even when the third roll jails you. Every case below follows from
that.

This is the area with the most edge cases, so each is listed separately.

| ID   | Situation                                                                           | Rule                                                                                                      | Status                   |
| ---- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| 5.1  | Roll doubles                                                                        | Move, resolve the space fully, then **roll again** as part of the same turn                               | ✅                       |
| 5.2  | Roll doubles a second time                                                          | Same again — no limit until the third                                                                     | ✅                       |
| 5.3  | Roll doubles a **third** consecutive time                                           | Go **directly to Jail**. The third roll is **not** played: no movement, no space resolution, no GO salary | ✅ `DOUBLES_BEFORE_JAIL` |
| 5.4  | Doubles, and the move lands on **Go To Jail**                                       | Go to Jail. The turn **ends** — the extra roll is forfeited                                               | ✅                       |
| 5.5  | Doubles, and a **card** sends the player to Jail                                    | Same: the turn ends, extra roll forfeited                                                                 | ✅                       |
| 5.6  | Doubles, and the move lands on Chance / Community Chest                             | Draw and resolve the card; the extra roll still stands afterwards (unless the card jailed the player)     | ✅                       |
| 5.7  | Doubles, and the space raises a decision (buy, auction, rent the player cannot pay) | The extra roll waits until the decision is answered, and is restored from `doublesCount` when it settles  | ✅                       |
| 5.8  | Doubles rolled **while in Jail**                                                    | Releases the player, who moves by that roll — but the turn **ends**. No extra roll for the double         | ✅                       |
| 5.9  | Doubles rolled in Jail                                                              | Do **not** count toward the three-doubles rule; the counter resets                                        | ✅ `doublesCount: 0`     |
| 5.10 | Doubles after leaving Jail by paying the fine or using a card                       | A normal roll: doubles grant an extra roll as usual                                                       | ✅                       |
| 5.11 | Player goes bankrupt part-way through a doubles turn                                | No extra roll — they are out                                                                              | ✅                       |

**Why case 7 is subtle.** `resolveCurrentSpace` sets `canRollAgain: false` whenever a decision
blocks the turn, so any code reading it back afterwards concludes the turn is over. `doublesCount`
is the durable fact, and `resumeTurnAfterDecision` is the single place that restores the phase from
it — used by buying, by both auction outcomes, and by acknowledging a card. Buying used to derive it
from `doublesCount` while the auction paths read `canRollAgain`, so **declining a property silently
forfeited an extra roll that buying it kept.** Fixed, and pinned by a test that compares the two
paths directly.

**Why 4, 5 and 8 need explicit code:** `resolveCurrentSpace` recomputes the phase after resolving a
space, and would otherwise hand a jailed player `canRollAgain: true` — leaving them able to roll
while in Jail, which the engine then rejects. There is an explicit `inJail` guard for exactly this,
covered by a regression test, and `acknowledgeCard` repeats the guard for case 5.

---

## 6. Jail — every case

**While in Jail you get one roll per turn, for up to three turns.** The "three" is three turns, not
three rolls in one turn — and a double that frees you ends the turn rather than earning another roll.

A player in Jail is **not** out of the game: they still collect rent, bid in auctions, build,
mortgage and trade. All of it works.

### Getting in

| ID  | Cause                                                                     | Status |
| --- | ------------------------------------------------------------------------- | ------ |
| 6.1 | Landing on **Go To Jail**                                                 | ✅     |
| 6.2 | Drawing a **Go to Jail** card                                             | ✅     |
| 6.3 | Rolling **three consecutive doubles**                                     | ✅     |
| 6.4 | Going to Jail never pays the GO salary, even when passing GO to get there | ✅     |
| 6.5 | Landing on **Jail / Just Visiting** is not jail — no effect               | ✅     |

### Getting out — three options, chosen at the start of your next turn

| ID  | Option                          | Rule                                                                 | Status |
| --- | ------------------------------- | -------------------------------------------------------------------- | ------ |
| 6.6 | Pay the fine                    | Pay ₹50 (`JAIL_FINE`), then roll and move normally                   | ✅     |
| 6.7 | Use a Get Out of Jail Free card | Card returns to the bottom of its deck; then roll and move           | ✅     |
| 6.8 | Try for doubles                 | Roll; on doubles you leave and move by that roll, **turn then ends** | ✅     |

### The three-turn limit

| ID   | Rule                                                                              | Status |
| ---- | --------------------------------------------------------------------------------- | ------ |
| 6.9  | Up to three turns may be spent trying for doubles (`MAX_JAIL_TURNS`)              | ✅     |
| 6.10 | On the **third** failed attempt: pay ₹50 and move using that same roll            | ✅     |
| 6.11 | The forced third-turn move grants **no** extra roll even if it was doubles        | ✅     |
| 6.12 | A failed attempt on turns one and two ends the turn with the player still in Jail | ✅     |

> **A player who cannot afford the fine stays in Jail.** Both paths that charge it — the voluntary
> fine and the mandatory third-turn one — used to overwrite the `asset-liquidation` decision that
> `resolveBankPayment` raises, so a player with under ₹50 walked out without paying. Both now leave
> the decision standing and leave the player where they are.

---

## 7. Landing on a space

| ID   | Space                              | Rule                                                      | Status |
| ---- | ---------------------------------- | --------------------------------------------------------- | ------ |
| 7.1  | Unowned street / railway / utility | Buy at the printed price, or decline                      | ✅     |
| 7.2  | Declined property                  | The bank **must** auction it immediately — see section 7a | ✅     |
| 7.3  | Owned by another player            | Pay rent, unless the property is mortgaged                | ✅     |
| 7.4  | Owned by you                       | Nothing happens                                           | ✅     |
| 7.5  | Income Tax                         | Pay ₹200                                                  | ✅     |
| 7.6  | Super Tax                          | Pay ₹100                                                  | ✅     |
| 7.7  | Chance / Community Chest           | Draw the top card, read it, then it applies               | ✅     |
| 7.8  | GO                                 | Collect ₹200                                              | ✅     |
| 7.9  | Free Parking                       | Nothing                                                   | ✅     |
| 7.10 | Jail / Just Visiting               | Nothing                                                   | ✅     |
| 7.11 | Go To Jail                         | Go to Jail; do not collect GO                             | ✅     |

### 7a. Auctions

The rule most often skipped in casual play: **declining is not the same as leaving a property
unowned.** Every detail below is verified by a test.

| ID    | Rule                                                                    | Status             |
| ----- | ----------------------------------------------------------------------- | ------------------ |
| 7a.1  | Declining triggers an auction immediately; it is not optional           | ✅                 |
| 7a.2  | **The player who declined may bid**, and often should                   | ✅                 |
| 7a.3  | Every non-bankrupt player is a bidder, in board order                   | ✅                 |
| 7a.4  | Bidding opens at ₹10 (`AUCTION_START_PRICE`)                            | ✅                 |
| 7a.5  | Each bid must beat the highest by at least ₹1 (`AUCTION_MIN_INCREMENT`) | ✅                 |
| 7a.6  | **A player may not bid more cash than they hold**                       | ✅                 |
| 7a.7  | **Passing is final** — a player who passes cannot re-enter              | ✅                 |
| 7a.8  | If every player passes, the property **stays with the bank**, unowned   | ✅                 |
| 7a.9  | The winner pays the bank and takes the deed                             | ✅                 |
| 7a.10 | An auction does not consume the extra roll a double earned              | ✅ — see section 5 |

> **Fixed during this audit.** The bidder rotation advanced by one and wrapped, without skipping
> players who had already passed. Because bidding advances the index too, a bid/pass interleave
> could land the turn back on someone who had left the auction — who was then asked to act, and
> could bid their way back in. `nextActiveBidderIndex` now skips passed players.

### Rent

| ID   | Rule                                                                           | Status                     |
| ---- | ------------------------------------------------------------------------------ | -------------------------- |
| 7r.1 | Street base rent from the title deed                                           | ✅                         |
| 7r.2 | Rent **doubles** when one player owns the whole colour group and it is unbuilt | ✅ `ownsEntireColorSet`    |
| 7r.3 | Street rent by build level (1–4 houses, hotel)                                 | ✅                         |
| 7r.4 | Railway rent by stations owned: ₹25 / ₹50 / ₹100 / ₹200                        | ✅ `RAILWAY_RENT_BY_COUNT` |
| 7r.5 | Utility rent: 4× the dice roll with one owned, 10× with both                   | ✅                         |
| 7r.6 | **Mortgaged** property collects no rent                                        | ✅                         |
| 7r.7 | Rent must be asked for — in this app it is automatic                           | ✅ (adaptation)            |

**Mortgaged properties still count as owned.** Mortgaging is a loan, not a sale, so a mortgaged
street still counts toward its colour set, and a mortgaged railway or utility still counts toward
the owner's total. Concretely: own all three Red streets, mortgage one, and rent on the other two
is still doubled; own all four railways, mortgage one, and the other three still charge the
four-railway rate. `ownsEntireColorSet` and the railway/utility counts read `ownerPlayerId` only,
never `mortgaged` — deliberately. ✅

---

## 8. Building houses and hotels — ✅ implemented

Building is done from a site's own panel — click any site you own on the board. `buildLevel` is
0-5 on `OwnershipState`: 0-4 houses, 5 a hotel. One scale for both is what makes the even rules a
single comparison, and it is what the rent table has always read.

Both even rules are the same question asked in opposite directions: **no two sites in a colour
group may ever differ by more than one level**. `buildBlockedReason` and `sellBlockedReason`
(`domain/rules/buildings.utils.ts`) are the single statement of it, shared by the engine's throw and
the panel's disabled button, so the two can never disagree about why something is refused.

### When you may build

| ID  | Rule                                                                   |
| --- | ---------------------------------------------------------------------- |
| 8.1 | You must own **every** property in the colour group                    |
| 8.2 | No property in that group may be mortgaged                             |
| 8.3 | Houses cost the amount printed on the deed (`houseCost`)               |
| 8.4 | You may build any number of houses in one turn, as long as you can pay |

### The even-building rule

The rule most often forgotten. **The number of houses on any two properties in a group may never
differ by more than one.**

Legal, for the Red group:

| Round | Lucknow | Chandigarh | Jaipur |
| ----- | ------- | ---------- | ------ |
| 1     | 1       | 1          | 1      |
| 2     | 2       | 2          | 2      |

Illegal — a two-house gap:

| Lucknow | Chandigarh | Jaipur |
| ------- | ---------- | ------ |
| 3       | 1          | 1      |

### Hotels

| ID  | Rule                                                                                 |
| --- | ------------------------------------------------------------------------------------ |
| 8.5 | Maximum **4 houses** per property, then it upgrades to **1 hotel**                   |
| 8.6 | **Every** property in the group must already hold 4 houses before any hotel is built |
| 8.7 | Building a hotel returns that property's 4 houses to the bank and pays `hotelCost`   |
| 8.8 | One hotel per property; you cannot build beyond it                                   |

### Bank inventory

| ID   | Rule                                                                            | Status                                                                                                  |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 8.9  | The bank holds 32 houses and 12 hotels (`HOUSES_AVAILABLE`, `HOTELS_AVAILABLE`) | ✅ decremented on every build and returned on every sale; a hotel takes its four houses back into stock |
| 8.10 | When the bank is empty, building is refused — there is nothing to bid for       | ✅                                                                                                      |
| 8.11 | When the bank runs out, players wanting to build bid for what is available      | ✅ opening price is the printed cost; the winner picks the site                                         |

### Selling buildings

| ID   | Rule                                                                                          |
| ---- | --------------------------------------------------------------------------------------------- |
| 8.12 | Buildings sell **to the bank only**, never to another player                                  |
| 8.13 | They sell for **half** the purchase price                                                     |
| 8.14 | Selling must also be **even** — the same one-house-maximum-difference rule applies in reverse |
| 8.15 | A hotel may be sold outright, or broken back into houses if the bank has enough               |

Legal sell-down from 3/3/3: → 2/3/3 → 2/2/3 → 2/2/2. Illegal: 3/3/3 → 0/3/3.

**A hotel reverts to four houses**, refunding half the hotel cost, and needs four houses in the
bank to do it. A hotel can therefore be temporarily unsellable during a house shortage — that is
the printed rule, and the panel says so rather than failing silently.

**When the bank cannot satisfy everyone who could build, the next building goes to auction.** Asking
to build opens the bidding instead of placing a house: the opening price is that site's printed house
or hotel cost, and only players who could legally build are invited. The winner pays their bid — not
the printed price — and then chooses which of their own eligible sites it goes on, because the
auction sold the building, not the site.

Zero stock is not contention: there is nothing to bid for, so the build is simply refused.

> **How "wishes to buy" is read.** The printed rule triggers on "two or more players wish to buy more
> than the Bank has". Nobody can be asked what they want on someone else's turn, so contention is
> read as **more players who _could_ legally build than there are buildings left**. Cash and stock
> are deliberately left out of that count — stock is the thing being contested, and a player who
> cannot afford the printed price may still outbid from what they raise. In practice this only fires
> when the bank is nearly exhausted, which is exactly when the rule matters.

**Rounding:** a building refund is `floor(cost / 2)`, so the bank keeps the odd rupee. Redemption
rounds the other way, up, for the same reason — both favour the bank, deliberately and
consistently.

---

## 9. Mortgages — ✅ implemented

| ID  | Rule                                                                                             | Status                                                                            |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 9.1 | Mortgaging pays the `mortgageValue` printed on the deed                                          | ✅                                                                                |
| 9.2 | The property stays yours; you simply collect no rent on it                                       | ✅                                                                                |
| 9.3 | **You cannot mortgage a property with buildings anywhere in its colour group** — sell them first | ✅ the guard exists; a no-op until building lands, since `buildLevel` is always 0 |
| 9.4 | Unmortgaging costs the mortgage value **plus `MORTGAGE_INTEREST_PERCENT`%**                      | ✅                                                                                |
| 9.5 | A mortgaged property can still be traded                                                         | ✅ the receiver pays the 10% and it stays mortgaged                               |
| 9.6 | The bank never buys a property back; mortgage, trade or sell to a player instead                 | ✅ by omission — no such command exists                                           |

**Rounding.** The printed rule says "plus 10%" without saying how to round, and every other amount in
this game is a whole number. The interest is rounded **up** — `mortgageValue + ceil(mortgageValue *
10 / 100)`, so a ₹70 mortgage costs ₹77 to redeem. Favours the bank; `getRedemptionCost` in
`gameEngine.ts` is the single place it is decided.

**Where you mortgage from.** Either the site panel (click the site on the board), or the liquidation
panel when you owe money you cannot pay — see §11. The liquidation panel lists your mortgageable
sites itself, because the decision modal is non-dismissible and covers the board.

## 10. Trading — ✅ implemented

A trade starts from an opponent's site panel — "Offer a deal" — and opens a two-column builder:
what you give on the left, what you get on the right. The other player sees the same two sides
read-only and either accepts or rejects. Rejecting hands the turn straight back, extra roll intact.

The builder offers no opinion on whether a deal is fair. Any price both players agree on is legal,
and that is the one rule this screen must not get in the way of; the only offer it refuses to send
is one that moves nothing at all.

| Tradeable                  | Not tradeable         |
| -------------------------- | --------------------- |
| Cash                       | Houses and hotels     |
| Streets                    | Promises to pay later |
| Railway stations           | Loans between players |
| Utilities                  |                       |
| Get Out of Jail Free cards |                       |

| ID   | Rule                                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.1 | Any price both players agree on is legal — ₹20 for a ₹180 site, or ₹500, both fine                                                                  |
| 10.2 | A property with buildings anywhere in its colour group cannot be traded until they are sold                                                         |
| 10.3 | Mortgaged properties may be traded; the receiver either clears the mortgage or pays 10% to keep it                                                  |
| 10.4 | **You cannot auction property you own.** An auction is only ever the bank's forced sale of an _unowned_ property a player declined — see section 7a |
| 10.5 | **You cannot sell property back to the bank** at any price. Selling to another player is the only route                                             |

**The receiver of a mortgaged site chooses what to do about it.** The accept panel asks, per site:
keep it mortgaged for the 10% interest, or clear the mortgage outright for the mortgage value plus
the same 10%. Keeping is the default because it costs less. Acceptance is refused if they cannot
cover what they chose.

Only the receiving side chooses. A mortgaged site going the other way is always taken as it stands:
the proposer agreed to the deal without knowing what the other player would elect.

---

## 11. Insolvency and bankruptcy — ✅ implemented

The order of rescue when you cannot pay:

| ID   | Step                                         | Status                       |
| ---- | -------------------------------------------- | ---------------------------- |
| 11.1 | 1. Sell buildings back to the bank           | ✅ listed first in the panel |
| 11.2 | 2. Mortgage properties                       | ✅                           |
| 11.3 | 3. Sell or trade properties to other players | ✅                           |

**Owing money you cannot pay works.** The debt raises an `asset-liquidation` decision naming the
amount, the creditor and the reason. The panel lists every building you could sell and every site you
could mortgage, and what each pays — buildings first, because a site whose colour set holds any
cannot be mortgaged at all; a **Pay** button unlocks the moment your cash covers the debt, and settling transfers the money
to the creditor — or to the bank when there is none — and hands the turn back, extra roll intact if a
double had earned one.

### Bankruptcy — ✅ implemented

You are bankrupt when the debt exceeds **cash plus everything you could raise**, not merely when you
are short right now. The panel offers **Declare bankruptcy** only at that point, and the engine
refuses the command while the debt is still reachable — so you cannot walk away from a debt you could
have paid.

| ID   | Creditor       | Outcome                                                                                            | Status |
| ---- | -------------- | -------------------------------------------------------------------------------------------------- | ------ |
| 11.4 | Another player | They receive your cash, every property including mortgaged ones, and your jail cards. You are out  | ✅     |
| 11.5 | The bank       | Your properties return to the bank, mortgages cancelled, and are auctioned one by one. You are out | ✅     |

Players go out in order: `bankruptcyRank` counts up from 1 for the first player eliminated. Turn
rotation steps over anyone who is out — `nextActivePlayerIndex` — which it did not do before, since
nobody could go bankrupt.

**Every returned property is auctioned, one after another.** They go onto
`pendingAuctionSpaceIds` and are sold in turn, because only one auction can run at a time; as each
finishes the next opens by itself, and the turn resumes when the queue is empty. Any buildings on
them go back into the bank's stock first.

A queued site nobody bids for simply stays unowned, to be bought by whoever lands on it. And if the
bankruptcy left one player standing, the game is over and the queue is dropped — auctioning to the
winner alone is theatre.

An unpaid debt is always answered before the bank starts selling: `afterDecisionResolved` is the one
place that order is decided, so settling and going bankrupt cannot disagree about it.

### Winning

The moment a bankruptcy leaves exactly one player standing, the game is over: `winnerPlayerId` is
written, `status` becomes `completed`, and a non-dismissible `game-over` decision announces the
winner. Every later command is refused — `ensureGameNotFinished` throws — so a finished game stays
finished, including after a reload. The only way on is back to the home page.

A player's `bankruptcyRank` records the order they went out, so a finished game still shows who
placed where.

## 12. Speed Die — ✅ implemented

Optional faster-play rules from the India Edition box, switched on at setup and fixed for the
game's lifetime. The in-app booklet ([RulesSpeedDie.tsx](../src/components/rules/RulesSpeedDie.tsx))
is the canonical copy; this is the same ruleset stated as testable rules.

The die's six faces are 1, 2, 3, **Bus, Bus** and Mr. Monopoly — Bus appears twice on the printed
die, which is why `SPEED_DIE_FACES` is a list rather than the enum's values.

### When it is used

| ID   | Rule                                                                                         |
| ---- | -------------------------------------------------------------------------------------------- |
| 12.1 | Optional — agreed before the game starts                                                     |
| 12.2 | **Not used until every player has passed GO once.** Until then, roll the two white dice only |
| 12.3 | Each player starts a Speed Die game with an extra ₹1000 (`SPEED_DIE_BONUS_CASH`)             |
| 12.4 | Rolled together with the two white dice, every turn, once active                             |

### The faces

| ID   | Face             | Effect                                                                                                                                                                                                                                                  |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12.5 | **1, 2, 3**      | Added to the two white dice, then move and resolve normally — ✅                                                                                                                                                                                        |
| 12.6 | **Bus**          | Choose one white die, the other, or both. Three buttons, because those are the only legal answers — ✅                                                                                                                                                  |
| 12.7 | **Mr. Monopoly** | Move by the white dice and resolve, **then** advance to the next unowned asset to buy or auction; if none are unowned, to the next **unmortgaged** asset an opponent owns and pay its rent — a mortgaged one is skipped, since it collects nothing — ✅ |

### Speed Die interaction with doubles and Jail

The edge cases the user is most likely to hit, and the reason this section exists:

| ID    | Rule                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12.8  | **Only the two white dice count for doubles.** A Speed Die showing the same number as them is irrelevant                                                                  |
| 12.9  | **Only the two white dice count for rolling out of Jail**                                                                                                                 |
| 12.10 | A Speed Die 1/2/3 is added _after_ the doubles check, so it never creates or breaks a double                                                                              |
| 12.11 | **If all three dice show the same number, move to any space on the board of your choice** — and that is not a double, so it grants no extra roll                          |
| 12.12 | Three consecutive white-dice doubles send you to Jail as in the base game — **unless the third roll is a triple**, which moves you anywhere instead and does not jail you |
| 12.13 | A Mr. Monopoly advance happens after the space is resolved; if the white dice were doubles, the extra roll still follows                                                  |

**Why a triple is not the third double.** All three dice matching means the white pair matched too, so
a naive reading jails a player on their third consecutive double. The printed rule is that a triple is
its own outcome: they move anywhere and their turn ends. Both outside sources are explicit — _"if a
player rolls doubles twice and then a triple, they do not go to jail... and the player does not roll
again."_ The engine implements it by resetting `doublesCount` to 0 on a triple, which is load-bearing:
without it, `resumeTurnAfterDecision` would hand back an extra roll after the destination was chosen.

**How the Mr. Monopoly advance survives a decision.** The landed space may raise one — a buy, a
card, a debt — and the advance is still owed when it is answered. It is therefore a turn field,
`turn.pendingMonopolyAdvance`, applied by `resumeTurnAfterDecision` rather than run inline. That is
also why `BuyLandedAsset` no longer restates the resume rules itself: it used to, and an advance
owed across a buy decision was silently dropped.

**A utility reached without rolling is charged on a fresh throw.** `resolveCurrentSpace` takes the
dice total that rent is charged on: the turn's own roll when the player rolled their way there, and
a new throw after a Mr. Monopoly advance or a three-of-a-kind move. Before the Speed Die this was
latent — no card in either deck lands on a utility — and now it is reachable.

**A three-of-a-kind move travels forward.** The token walks round the board to the chosen space
rather than teleporting, so it collects the GO salary on the way if it passes GO.

---

## 13. Board mapping

| ID   | Fact                   | Value                                                                                             |
| ---- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| 13.1 | Spaces                 | 40                                                                                                |
| 13.2 | Ownable assets         | 28 — 22 streets, 4 railway stations, 2 utilities                                                  |
| 13.3 | Colour groups          | 8: brown (2), light blue (3), pink (3), orange (3), red (3), yellow (3), green (3), dark blue (2) |
| 13.4 | Chance spaces          | 3 (indices 7, 22, 36)                                                                             |
| 13.5 | Community Chest spaces | 3 (indices 2, 17, 33)                                                                             |
| 13.6 | Corners                | GO (0), Jail / Just Visiting (10), Free Parking (20), Go To Jail (30)                             |
| 13.7 | Chance cards           | 8                                                                                                 |
| 13.8 | Community Chest cards  | 8                                                                                                 |
| 13.9 | Space order            | The 40 spaces in the order listed below, index for index                                          |

Values: GO ₹200 · Income Tax ₹200 · Super Tax ₹100 · Jail fine ₹50 · auction opens at ₹10, minimum
increment ₹1 · starting cash ₹1500.

### Space order

| #   | Space                           | #   | Space                        |
| --- | ------------------------------- | --- | ---------------------------- |
| 0   | GO                              | 20  | Free Parking                 |
| 1   | Guwahati                        | 21  | Lucknow                      |
| 2   | Community Chest                 | 22  | Chance                       |
| 3   | Bhubaneshwar                    | 23  | Chandigarh                   |
| 4   | Income Tax                      | 24  | Jaipur                       |
| 5   | Chennai Central Railway Station | 25  | New Delhi Railway Station    |
| 6   | Panaji (Goa)                    | 26  | Ahmedabad                    |
| 7   | Chance                          | 27  | Water Works                  |
| 8   | Agra                            | 28  | Hyderabad                    |
| 9   | Vadodara                        | 29  | Pune                         |
| 10  | Jail / Just Visiting            | 30  | Go To Jail                   |
| 11  | Ludhiana                        | 31  | Kolkata                      |
| 12  | Electric Company                | 32  | Chennai                      |
| 13  | Patna                           | 33  | Community Chest              |
| 14  | Bhopal                          | 34  | Bengaluru                    |
| 15  | Howrah Railway Station          | 35  | Chhatrapati Shivaji Terminus |
| 16  | Indore                          | 36  | Chance                       |
| 17  | Community Chest                 | 37  | Delhi                        |
| 18  | Nagpur                          | 38  | Super Tax                    |
| 19  | Kochi                           | 39  | Mumbai                       |

---

## 14. Card effects

`CardEffectKind` covers every effect the two decks use:

| ID   | Effect            | Meaning                                                                   | Status                                       |
| ---- | ----------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| 14.1 | `Collect`         | Bank pays the player                                                      | ✅                                           |
| 14.2 | `Pay`             | Player pays the bank                                                      | ✅                                           |
| 14.3 | `MoveTo`          | Advance to a board index, collecting GO if `collectGo` and the move wraps | ✅                                           |
| 14.4 | `MoveSteps`       | Move relative to the current position; a forward move that wraps pays GO  | ✅                                           |
| 14.5 | `GoToJail`        | Straight to Jail, no GO salary                                            | ✅                                           |
| 14.6 | `JailFree`        | Player keeps the card; it leaves the deck until used                      | ✅                                           |
| 14.7 | `CollectFromEach` | Every other solvent player pays the drawer                                | ✅ debts queue if more than one cannot pay   |
| 14.8 | `PayEach`         | The drawer pays every other solvent player                                | ✅ implemented; no card in this deck uses it |

### Card edge cases

| ID    | Case                                                                                                           | Rule                                                                                           | Status                              |
| ----- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| 14.9  | **A card that leads to another card.** Chance at 36 with "go back three spaces" lands on Community Chest at 33 | The second card is drawn and must be acknowledged in turn; the turn does not settle in between | ✅ verified by test                 |
| 14.10 | A card moves the player **backwards** past GO                                                                  | No salary — you only collect going forwards                                                    | ✅ `movePlayerTo` takes `isForward` |
| 14.11 | A card moves the player forwards past GO                                                                       | Salary is paid when `collectGo` is set on the card                                             | ✅                                  |
| 14.12 | A card sends the player to Jail                                                                                | Turn ends; any extra roll from a double is forfeited                                           | ✅                                  |
| 14.13 | A card lands the player on an unowned property                                                                 | Buy or auction, exactly as if they had rolled there                                            | ✅                                  |
| 14.14 | A card lands the player on another player's property                                                           | Rent is owed, exactly as if they had rolled there                                              | ✅                                  |
| 14.15 | A Get Out of Jail Free card is drawn                                                                           | It leaves the deck and is held by the player, not recycled                                     | ✅                                  |
| 14.16 | A player may hold **more than one** Get Out of Jail Free card                                                  | The cards themselves are held, so both can be                                                  | ✅                                  |

**A used jail card goes back to the bottom of its own deck.** `jailFreeCards` holds the cards
themselves rather than a count, so each one knows the deck it came from. Before that it was a bare
number, and both cards could leave circulation permanently over a long game. The change was a
`GameState` shape change: `GAME_STATE_VERSION` is 5, and a v1 save's count migrates to that many
Chance cards — the deck a v1 card came from is genuinely unrecoverable, and Chance is the likelier
of the two.

**A player who did not roll their way to a utility is charged on a fresh throw.** That is the
printed rule for any card-driven arrival, and it is what `resolveCurrentSpace` now takes: the turn's
own roll when they rolled there, a new throw when a card or a Mr. Monopoly advance put them there.
It used to multiply by the roll that started the turn, which no card in this deck could reach — but
the Speed Die can.

A drawn card is **shown before it acts**: the draw sets a `card-draw` decision and the effect is
applied by `acknowledgeCard`. See [features/action-feedback.md](features/action-feedback.md).

**Several players unable to pay the same card all still owe it.** Both loops read `nextState`, so
who pays and what they hold is current rather than a snapshot; and a debt nobody can cover queues
behind the first rather than overwriting it. The queue rides inside the liquidation decision, which
is why it survives a save — `pendingDecision` is the one part validated with `.passthrough()`. Each
debt is answered in turn, and one owed by a player who goes bankrupt in the meantime is dropped.

---

## 15. The bank

| ID   | Rule                                                                                   | Status                                              |
| ---- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 15.1 | The bank never runs out of money and can never go bankrupt (`bank.cash: 'unlimited'`)  | ✅                                                  |
| 15.2 | The bank holds the 32 houses and 12 hotels, and property nobody has bought             | ✅ decremented and returned on every build and sale |
| 15.3 | The bank collects taxes and fines, and pays salaries and card collections              | ✅                                                  |
| 15.4 | The bank **never buys a property back**. Mortgage it, trade it, or sell it to a player | ✅ by omission — no such command exists             |
| 15.5 | The bank buys buildings back at half price                                             | ✅ `floor(cost / 2)`                                |

## 16. Turn order

| ID   | Rule                                                                                   | Status                                                                                    |
| ---- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 16.1 | Play passes to the left; order is fixed at setup                                       | ✅                                                                                        |
| 16.2 | A player in Jail still takes their turn — they choose a Jail action instead of rolling | ✅                                                                                        |
| 16.3 | A player with an extra roll from a double keeps the turn rather than passing it on     | ✅                                                                                        |
| 16.4 | **Bankrupt players are skipped**                                                       | ✅ `nextActivePlayerIndex` walks past anyone who is bankrupt                              |
| 16.5 | The game ends when one player remains                                                  | ✅ the last bankruptcy writes the winner, completes the game and refuses further commands |

## 17. Implementation summary

**Fully implemented:** setup for 2–8 players, stable game ids, save/resume/delete, the board and its
economics, the two-dice turn, doubles including all three Jail interactions, passing GO, taxes, Go To
Jail, the full card draw-then-apply flow with chained draws, every card effect, buy or decline, the
complete auction loop, street/railway/utility rent with colour-set doubling, all three Jail exits and
the three-turn limit, turn rotation, ₹ throughout, per-action feedback, and **mortgaging, redeeming
and settling a debt you could not otherwise pay, bankruptcy when you cannot, the win that ends
the game, and building and selling houses and hotels with both even rules and a real bank
inventory, trading between players, and the optional Speed Die**.

Nothing in the ruleset is type-level only any more.

### Fixed so far

| Bug                                             | Effect                                                                                                                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extra roll lost on decline                      | Rolling doubles, landing on an unowned site and **declining** forfeited the extra roll that **buying** it kept. One `resumeTurnAfterDecision` now serves both                |
| Passed bidders re-prompted                      | The auction index wrapped without skipping players who had passed, so a bid/pass interleave could hand the turn back to someone who had left                                 |
| **`asset-liquidation` was a dead end**          | A player who could not pay was stuck for the rest of the game. `settleDebt` is the exit; mortgaging raises the cash. The insolvent branches also moved no money at all       |
| **The Jail fine released an insolvent player**  | Both paths — the voluntary fine and the mandatory third-turn one — overwrote the liquidation decision and let a player with under ₹50 walk out                               |
| `CollectFromEach` / `PayEach` stale reads       | Both loops decided who pays from a snapshot taken before any payment happened                                                                                                |
| **A game could never end**                      | The last player standing is now declared the winner; before this a two-player game carried on with one bankrupt player who could do nothing                                  |
| **Several debts from one card**                 | One card can leave more than one player unable to pay, and only the first was recorded - everyone after them was silently forgiven. The extras queue inside the decision now |
| **Buying and auctions moved money inline**      | Both bypassed the payment primitives, so the "every amount goes through one choke point" invariant was not total                                                             |
| **`events` returned the whole history**         | And `saveRequired` was hardcoded true, so neither answered the question its name asks. The feedback layer had to diff the history itself                                     |
| **A backward move could collect the GO salary** | The wrap test was a bare `next < current`, true of any backward move. Latent, because the one backward card passed `collectGo: false`                                        |

### Divergences from the printed rules

None that change how the game plays. Every bug and every deferred rule in earlier drafts of this
document has been closed; what is left are two readings rather than departures:

| Reading                                               | Where it is explained                                  |
| ----------------------------------------------------- | ------------------------------------------------------ |
| A mortgaged site still counts toward colour sets      | Section 9 — this one matches the printed rule          |
| "Wishes to buy" a scarce building means "could build" | Section 8 — nobody can be asked on someone else's turn |

The one real departure is the deliberate one in section 2: building, selling, mortgaging and trading
are offered in safe UI windows rather than at literally any moment, because a turn-based interface
cannot model interrupting another player's roll.
