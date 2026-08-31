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

## 1. Source precedence

1. User product requirements
2. Uploaded Monopoly India Edition booklet and board images
3. Official Monopoly rules for anything the above leave open

## 2. Locked digital adaptations

Deliberate departures from the printed game, not omissions:

| Adaptation                                                                 | Why                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Rent is auto-collected when owed                                           | No banker to police it; forgetting to ask is not a skill                        |
| Building and trading are offered in safe UI windows, not interrupt-anytime | A turn-based UI has no way to model "interrupt during someone else's roll"      |
| Auction opens at ₹10 with a minimum increment of ₹1                        | The printed game has no opening bid; a digital auction needs a floor and a step |
| Free Parking pays nothing                                                  | The official rule. The jackpot is a house rule                                  |
| Income Tax is a flat ₹200                                                  | The "pay 10% of total worth" option is dropped; net worth mid-turn is ambiguous |

---

## 3. Setup

| Rule                                                                      | Status |
| ------------------------------------------------------------------------- | ------ |
| 2–8 players (`MIN_PLAYERS`, `MAX_PLAYERS`)                                | ✅     |
| Each player starts with ₹1500 (`STARTING_CASH`)                           | ✅     |
| Each player picks a token from the theme's catalogue                      | ✅     |
| All tokens start on GO                                                    | ✅     |
| Both decks shuffled once at creation                                      | ✅     |
| Turn order decided by a simulated opening roll (`chooseFirstPlayerOrder`) | ✅     |
| Speed Die game: every player gets an extra ₹1000 (`SPEED_DIE_BONUS_CASH`) | ❌     |

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

This is the area with the most edge cases, so each is listed separately.

| #   | Situation                                                                           | Rule                                                                                                      | Status                   |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Roll doubles                                                                        | Move, resolve the space fully, then **roll again** as part of the same turn                               | ✅                       |
| 2   | Roll doubles a second time                                                          | Same again — no limit until the third                                                                     | ✅                       |
| 3   | Roll doubles a **third** consecutive time                                           | Go **directly to Jail**. The third roll is **not** played: no movement, no space resolution, no GO salary | ✅ `DOUBLES_BEFORE_JAIL` |
| 4   | Doubles, and the move lands on **Go To Jail**                                       | Go to Jail. The turn **ends** — the extra roll is forfeited                                               | ✅                       |
| 5   | Doubles, and a **card** sends the player to Jail                                    | Same: the turn ends, extra roll forfeited                                                                 | ✅                       |
| 6   | Doubles, and the move lands on Chance / Community Chest                             | Draw and resolve the card; the extra roll still stands afterwards (unless the card jailed the player)     | ✅                       |
| 7   | Doubles, and the space raises a decision (buy, auction, rent the player cannot pay) | The extra roll waits until the decision is answered, and is restored from `doublesCount` when it settles  | ✅                       |
| 8   | Doubles rolled **while in Jail**                                                    | Releases the player, who moves by that roll — but the turn **ends**. No extra roll for the double         | ✅                       |
| 9   | Doubles rolled in Jail                                                              | Do **not** count toward the three-doubles rule; the counter resets                                        | ✅ `doublesCount: 0`     |
| 10  | Doubles after leaving Jail by paying the fine or using a card                       | A normal roll: doubles grant an extra roll as usual                                                       | ✅                       |
| 11  | Player goes bankrupt part-way through a doubles turn                                | No extra roll — they are out                                                                              | ❌ no bankruptcy at all  |

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

A player in Jail is **not** out of the game: they still collect rent, bid in auctions, build,
mortgage and trade. ⚠️ — collecting rent works; the rest is unimplemented for everyone.

### Getting in

| Cause                                                                     | Status |
| ------------------------------------------------------------------------- | ------ |
| Landing on **Go To Jail**                                                 | ✅     |
| Drawing a **Go to Jail** card                                             | ✅     |
| Rolling **three consecutive doubles**                                     | ✅     |
| Going to Jail never pays the GO salary, even when passing GO to get there | ✅     |
| Landing on **Jail / Just Visiting** is not jail — no effect               | ✅     |

### Getting out — three options, chosen at the start of your next turn

| Option                          | Rule                                                                 | Status           |
| ------------------------------- | -------------------------------------------------------------------- | ---------------- |
| Pay the fine                    | Pay ₹50 (`JAIL_FINE`), then roll and move normally                   | ⚠️ see bug below |
| Use a Get Out of Jail Free card | Card returns to the bottom of its deck; then roll and move           | ✅               |
| Try for doubles                 | Roll; on doubles you leave and move by that roll, **turn then ends** | ✅               |

### The three-turn limit

| Rule                                                                              | Status |
| --------------------------------------------------------------------------------- | ------ |
| Up to three turns may be spent trying for doubles (`MAX_JAIL_TURNS`)              | ✅     |
| On the **third** failed attempt: pay ₹50 and move using that same roll            | ✅     |
| The forced third-turn move grants **no** extra roll even if it was doubles        | ✅     |
| A failed attempt on turns one and two ends the turn with the player still in Jail | ✅     |

> **⚠️ Known bug — the broke player escapes.** `payJailFine` calls `resolveBankPayment`, which sets
> an `asset-liquidation` decision when the player cannot afford ₹50. The lines straight after
> overwrite `pendingDecision` back to `none`, so a player with less than ₹50 leaves Jail without
> paying. Its real fix is bound up with resolving liquidation at all, which needs mortgages. See
> `gameEngine.ts` `PayJailFine` and CLAUDE.md section 8.

---

## 7. Landing on a space

| Space                              | Rule                                                                                            | Status |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| Unowned street / railway / utility | Buy at the printed price, or decline                                                            | ✅     |
| Declined property                  | The bank **must** auction it immediately. Anyone may bid, **including the player who declined** | ✅     |
| Owned by another player            | Pay rent, unless the property is mortgaged                                                      | ✅     |
| Owned by you                       | Nothing happens                                                                                 | ✅     |
| Income Tax                         | Pay ₹200                                                                                        | ✅     |
| Super Tax                          | Pay ₹100                                                                                        | ✅     |
| Chance / Community Chest           | Draw the top card, read it, then it applies                                                     | ✅     |
| GO                                 | Collect ₹200                                                                                    | ✅     |
| Free Parking                       | Nothing                                                                                         | ✅     |
| Jail / Just Visiting               | Nothing                                                                                         | ✅     |
| Go To Jail                         | Go to Jail; do not collect GO                                                                   | ✅     |

### Rent

| Rule                                                                           | Status                                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Street base rent from the title deed                                           | ✅                                                           |
| Rent **doubles** when one player owns the whole colour group and it is unbuilt | ✅ `ownsEntireColorSet`                                      |
| Street rent by build level (1–4 houses, hotel)                                 | ⚠️ the rent table is read, but `buildLevel` is never written |
| Railway rent by stations owned: ₹25 / ₹50 / ₹100 / ₹200                        | ✅ `RAILWAY_RENT_BY_COUNT`                                   |
| Utility rent: 4× the dice roll with one owned, 10× with both                   | ✅                                                           |
| **Mortgaged** property collects no rent                                        | ✅                                                           |
| Rent must be asked for — in this app it is automatic                           | ✅ (adaptation)                                              |

---

## 8. Building houses and hotels — ❌ not implemented

Every rule below is documented and none of it runs yet. `buildLevel` exists on `OwnershipState`,
is read by the rent table and net worth, and is never written. The rail's Build / Sell buttons are
disabled with a reason, as is the site panel's.

### When you may build

| Rule                                                                   |
| ---------------------------------------------------------------------- |
| You must own **every** property in the colour group                    |
| No property in that group may be mortgaged                             |
| Houses cost the amount printed on the deed (`houseCost`)               |
| You may build any number of houses in one turn, as long as you can pay |

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

| Rule                                                                                 |
| ------------------------------------------------------------------------------------ |
| Maximum **4 houses** per property, then it upgrades to **1 hotel**                   |
| **Every** property in the group must already hold 4 houses before any hotel is built |
| Building a hotel returns that property's 4 houses to the bank and pays `hotelCost`   |
| One hotel per property; you cannot build beyond it                                   |

### Bank inventory

| Rule                                                                            | Status                                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| The bank holds 32 houses and 12 hotels (`HOUSES_AVAILABLE`, `HOTELS_AVAILABLE`) | ⚠️ tracked but **never decremented** — the inventory is cosmetic |
| When the bank runs out, players wanting to build bid for what is available      | ❌                                                               |

### Selling buildings

| Rule                                                                                          |
| --------------------------------------------------------------------------------------------- |
| Buildings sell **to the bank only**, never to another player                                  |
| They sell for **half** the purchase price                                                     |
| Selling must also be **even** — the same one-house-maximum-difference rule applies in reverse |
| A hotel may be sold outright, or broken back into houses if the bank has enough               |

Legal sell-down from 3/3/3: → 2/3/3 → 2/2/3 → 2/2/2. Illegal: 3/3/3 → 0/3/3.

---

## 9. Mortgages — ❌ not implemented

`OwnershipState.mortgaged` exists, rent already skips a mortgaged property, and net worth already
values one at `mortgageValue`. Nothing can set it.

| Rule                                                                                             | Status                               |
| ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Mortgaging pays the `mortgageValue` printed on the deed                                          | ❌                                   |
| The property stays yours; you simply collect no rent on it                                       | ✅ (the rent half)                   |
| **You cannot mortgage a property with buildings anywhere in its colour group** — sell them first | ❌                                   |
| Unmortgaging costs the mortgage value **plus 10% interest**                                      | ❌ — no interest constant exists yet |
| A mortgaged property can still be traded                                                         | ❌                                   |
| The bank never buys a property back; mortgage, trade or sell to a player instead                 | n/a                                  |

---

## 10. Trading — ❌ not implemented

`TradeState`, `tradeState` and the `TradeResponse` decision are all declared and inert; the trade
commands have no UI entry point beyond a disabled "Offer a deal" button.

| Tradeable                  | Not tradeable         |
| -------------------------- | --------------------- |
| Cash                       | Houses and hotels     |
| Streets                    | Promises to pay later |
| Railway stations           | Loans between players |
| Utilities                  |                       |
| Get Out of Jail Free cards |                       |

| Rule                                                                                        |
| ------------------------------------------------------------------------------------------- |
| Any price both players agree on is legal — ₹20 for a ₹180 site, or ₹500, both fine          |
| A property with buildings anywhere in its colour group cannot be traded until they are sold |
| Mortgaged properties may be traded                                                          |

---

## 11. Insolvency and bankruptcy — ❌ not implemented

The order of rescue when you cannot pay:

1. Sell buildings back to the bank.
2. Mortgage properties.
3. Sell or trade properties to other players.

If you still cannot pay:

| Creditor       | Outcome                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| Another player | They receive your cash, properties, mortgaged properties and jail cards. You are out |
| The bank       | Everything goes to the bank, which auctions the properties. You are out              |

> **⚠️ Known bug — `asset-liquidation` is a dead end.** When a player cannot pay,
> `resolveBankPayment` / `resolvePlayerPayment` set that pending decision and **nothing in the
> codebase can clear it**. The player is stuck for the rest of the game. The insolvent branch also
> never debits the debtor or pays the creditor — the debt exists only in `amountDue`. Mortgaging is
> the only exit, which is why it heads the next phase of work.

There is also **no win detection**: `winnerPlayerId`, `GameStatus.Completed` and the `game-over`
decision are never set, and `isBankrupt` / `bankruptcyRank` are never written. Games run forever.

---

## 12. Speed Die — ❌ not implemented

Optional faster-play rules from the India Edition box. The in-app booklet
([RulesSpeedDie.tsx](../src/components/rules/RulesSpeedDie.tsx)) is the canonical copy; this is the
same ruleset stated as testable rules.

### When it is used

| Rule                                                                                         |
| -------------------------------------------------------------------------------------------- |
| Optional — agreed before the game starts                                                     |
| **Not used until every player has passed GO once.** Until then, roll the two white dice only |
| Each player starts a Speed Die game with an extra ₹1000 (`SPEED_DIE_BONUS_CASH`)             |
| Rolled together with the two white dice, every turn, once active                             |

### The faces

| Face             | Effect                                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1, 2, 3**      | Add that number to the two white dice total, then move and resolve normally                                                                                                                                           |
| **Bus**          | Choose the value of **one** white die, or of **both** white dice, and move that many spaces                                                                                                                           |
| **Mr. Monopoly** | Move by the white dice as usual and resolve that space. **Then** advance to the next unowned asset and buy or auction it. If every asset is owned, advance to the next asset owned by another player and pay its rent |

### Speed Die interaction with doubles and Jail

The edge cases the user is most likely to hit, and the reason this section exists:

| Rule                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Only the two white dice count for doubles.** A Speed Die showing the same number as them is irrelevant                                         |
| **Only the two white dice count for rolling out of Jail**                                                                                        |
| A Speed Die 1/2/3 is added _after_ the doubles check, so it never creates or breaks a double                                                     |
| **If all three dice show the same number, move to any space on the board of your choice** — and that is not a double, so it grants no extra roll |
| Three consecutive white-dice doubles still send you to Jail, exactly as in the base game                                                         |
| A Mr. Monopoly advance happens after the space is resolved; if the white dice were doubles, the extra roll still follows                         |

---

## 13. Board mapping

| Fact                   | Value                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Spaces                 | 40                                                                                                |
| Ownable assets         | 28 — 22 streets, 4 railway stations, 2 utilities                                                  |
| Colour groups          | 8: brown (2), light blue (3), pink (3), orange (3), red (3), yellow (3), green (3), dark blue (2) |
| Chance spaces          | 3 (indices 7, 22, 36)                                                                             |
| Community Chest spaces | 3 (indices 2, 17, 33)                                                                             |
| Corners                | GO (0), Jail / Just Visiting (10), Free Parking (20), Go To Jail (30)                             |
| Chance cards           | 8                                                                                                 |
| Community Chest cards  | 8                                                                                                 |

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

| Effect            | Meaning                                                                   | Status                              |
| ----------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| `Collect`         | Bank pays the player                                                      | ✅                                  |
| `Pay`             | Player pays the bank                                                      | ✅                                  |
| `MoveTo`          | Advance to a board index, collecting GO if `collectGo` and the move wraps | ✅                                  |
| `MoveSteps`       | Move relative to the current position; never collects GO                  | ✅                                  |
| `GoToJail`        | Straight to Jail, no GO salary                                            | ✅                                  |
| `JailFree`        | Player keeps the card; it leaves the deck until used                      | ✅                                  |
| `CollectFromEach` | Every other solvent player pays the drawer                                | ⚠️ see below                        |
| `PayEach`         | The drawer pays every other solvent player                                | ⚠️ implemented, **no card uses it** |

A drawn card is **shown before it acts**: the draw sets a `card-draw` decision and the effect is
applied by `acknowledgeCard`. See [features/action-feedback.md](features/action-feedback.md).

> **⚠️ Known bug — multi-player insolvency on one card.** The `CollectFromEach` / `PayEach` loops
> read the pre-mutation `state` rather than `nextState`, and each iteration can overwrite the
> previous player's `asset-liquidation` decision. If two players cannot pay the same card, only the
> last is recorded.

---

## 15. Implementation summary

**Fully implemented:** setup for 2–8 players, stable game ids, save/resume/delete, the board and its
economics, the two-dice turn, doubles including all three jail interactions, passing GO, taxes, Go
To Jail, the full card draw-then-apply flow and every card effect, buy or decline, the mandatory
auction loop, street/railway/utility rent with colour-set doubling, all three jail exits and the
three-turn limit, turn rotation, ₹ throughout, and per-action feedback.

**Type-level only, no runtime behaviour:** mortgages, buildings and both even rules, bank building
inventory, all trading, bankruptcy, win detection, Speed Die.

**Known bugs, each recorded in CLAUDE.md section 8:** the `asset-liquidation` dead end, the jail-fine
escape for a broke player, and the `CollectFromEach` / `PayEach` pre-mutation read.
