# Bot players

**Status:** Shipped (hot seat only)
**Entry points:** `src/domain/ai/botPolicy.ts`, `src/features/game/hooks/useBotTurns.ts`

## What it does

You can play on your own. Any seat at a hot-seat game can be handed to the machine at setup, so
one person and three bots is a game, and so is one person and one bot. Before this, the app
needed a second human in the room or a second device on the network — two players is the
engine's minimum and there was no way to be the only one of them.

A bot rolls, buys, bids, builds, mortgages, sells, gets itself out of Jail and goes bankrupt
when it has to, with nobody clicking anything.

## How it works

The engine already had everything a bot needs: it is pure, it is deterministic given a
`RandomSource`, and every rule it enforces is stated as a `*BlockedReason` that anything can
read. So a bot is a **command factory** and nothing else.

```
GamePage  → useBotTurns(game, isMoving)            features/game/hooks
          → chooseBotCommand(state)                domain/ai/botPolicy.ts   (pure)
          → dispatch(runGameCommand(command))      the same thunk a click uses
          → engine → save → publish → toast → sound
```

`chooseBotCommand` takes a `GameState` and returns one `RuntimeGameCommand`, or `null` meaning
"no legal move". It applies nothing, remembers nothing between calls, and touches neither React
nor the store — which is why it lives under `domain/` beside the engine it speaks to.

Three modules, split by what changes them:

| File                     | Holds                                                         |
| ------------------------ | ------------------------------------------------------------- |
| `bot.constants.ts`       | The float it keeps, and what it will pay at auction           |
| `botValuation.utils.ts`  | What a square is worth to a player — colour sets, extra rails |
| `botCashRaising.utils.ts`| Answering a debt, and spending spare cash on houses           |
| `botPolicy.ts`           | Which command, given the state                                |

The decision table is a `Record` keyed by `PendingDecision['type']`, the arrangement
`actor.utils.ts` uses and for the same reason: **a new decision type is a compile error here**
rather than a bot that silently sits on it and hangs the game for every human at the table.

## Key decisions

- **No `RandomSource` at all.** A bot that rolled its own dice to pick between moves would make
  the same save play out differently twice, and the one thing worth having when a bot deadlocks
  a game is the ability to hand its save to a test. Every choice is a function of the board.

- **Not one rule is restated.** Every command a bot sends comes from the engine's own
  predicates — `buyBlockedReason`, `bidBlockedReason`, `getPlayerActionOptions`,
  `getPlacementSites`, `getLiquidationValue`. A bot that guessed would throw out of the engine,
  and a throw inside the turn driver reaches nothing but `ErrorBoundary`: it takes the page down
  rather than the turn. This is the same guarantee the action rail gives a person.

- **A cash reserve, not a spending limit.** `BOT_CASH_RESERVE` is 20% of the starting cash and
  its whole job is the next rent bill. A bot that spends to its last rupee owns a great deal and
  goes out to the first railway it lands on — which in a two-handed game *ends* the game rather
  than losing it, and is a worse opponent than one that owns less. The one thing it will spend
  through the reserve for is the last street of a colour group, because that is the purchase
  there is no second chance at.

- **It bids the minimum, never more.** An auction escalates on its own as the other bidders
  answer, so bidding the least that takes the lead reaches the same winner for less money. The
  ceiling — above the printed price for a set, below it otherwise — is what ends it.

- **It never pays the Jail fine voluntarily.** The roll is free, the fine is not, and the engine
  already charges the fine on the third failure. Paying early buys certainty about a move the
  bot has no particular use for, and where that certainty is worth 50 is a judgement about the
  board a bot this size cannot make.

- **It declines every trade, and that is a stated limit rather than a stub.** Valuing an offer
  means weighing a colour set against cash against position, which is the whole of Monopoly
  strategy — and a bot that accepted badly would be *worse* than one that never accepts, because
  a human would find the lever and the game would stop being a game. Rejecting always resolves
  the decision, so no trade can hang a table.

- **Hot seat only.** A bot has no device. On an online table there is no answer to "which client
  sends its commands" that does not make one of them an authority over the running game, which
  [multiplayer.md](multiplayer.md) records as a decision not to take. The lobby cannot create a
  bot; `useBotTurns` checks `tableMode` anyway, because the failure without it is every device
  driving the same bot and all but one losing a conflict.

- **A table of nothing but bots is refused.** `SETUP_ERRORS.noHumans`. It plays itself to a
  winner with nobody watching a decision — not harmful, and not a game.

- **A pause before each move.** `BOT_MOVE_DELAY_MS`, on top of the board's own token walk. With
  no pause a bot's whole turn lands inside one frame and the only evidence it happened is the
  history; the point of watching an opponent is seeing what they did.

- **While a bot holds the move, this device is a Spectator.** `resolveViewer` says so, which
  withholds every control the way it already does for somebody else's turn online. Expressed
  there rather than as a clause inside `selectCanRollDice`, because
  `selectHasAvailableAction` — the deadlock detector — calls that selector through
  `HOT_SEAT_VIEWER` on purpose, so a bot clause inside it would report a deadlock on every bot
  turn and log an error for each one. The detector asks a different question ("does the game
  have a legal move for whoever owns it"), and a bot's turn has one. Without this the hot seat
  controls every chair including the machine's, so Roll sat live during a bot's turn — and
  pressing it raced the bot's own pending command into a phase it no longer fitted, which throws
  out of the engine. It reads `getExpectedActorId`, never the active player: an auction's bidder
  rotates independently of the turn, and a trade's recipient is never the active player.

## State and data

- **`PlayerState.isBot`** — on the player rather than per-device, for the same reason `tableMode`
  is on the state: every device has to agree, and a bot has to survive a save. A game resumed a
  day later must know which of its four players nobody is sitting behind.
- **`GAME_STATE_VERSION` 12**, with `v11ToV12` — the shortest migration in the file, because
  every player in a save written before bots existed is a person, and there is nothing to
  reconstruct. `schema.ts` also `.default(false)`s the field, which is the belt to that brace.
- Nothing else. `bot.constants.ts` is code, not state: how well a bot plays is not part of the
  save, so tuning it changes existing games without a version bump.

## Tests

| Level       | File                                              | Covers                                                                        |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Unit        | `src/domain/ai/botPolicy.test.ts`                 | Every branch by hand, plus four bots playing whole games to a winner           |
| Integration | `src/features/game/GamePage.bots.integration.test.tsx` | The page drives it, saves it, and leaves a human turn alone              |
| E2E         | `tests/e2e/bots.spec.ts`                          | One person starts a solo game, and the bot turn plays itself and hands back    |

**The whole-game test is the one that matters.** Every case somebody thought to write down can
pass while the policy still hangs on the one they did not, and `null` is how it says "no legal
move" — a bot that stops mid-turn leaves a table with no modal, no Roll and no End turn, and
nothing on screen saying why. Four seeds, because a single seed walks one path through the deck.

**And one bug it could not see, which only the browser could.** The driver's once-per-state guard
marked a move as sent when it was *scheduled* rather than when it was dispatched. React StrictMode
double-invokes an effect on mount — setup, cleanup, setup — so the cleanup cancelled the pending
timer and the second setup, seeing its own mark, returned without scheduling another. **Nothing was
ever dispatched.** It needed all three of StrictMode (the app has one, `renderWithProviders` does
not), a bot active on the very first render, and the guard marking too early — which is to say:
start a solo game, lose the opening roll, and the game is frozen on the first screen a player sees.
Every test passed, including the e2e journey, because that journey plays a human turn first and by
then the deps had changed and StrictMode was long done. `GamePage.bots.integration.test.tsx` now
mounts one case inside a `StrictMode` deliberately.

It found a real engine bug on its first run, and one a person would have hit too: **a player who
went bankrupt on a double kept their extra roll**, so `endTurn` put the phase back to
`AwaitRoll`, where `selectCanRollDice` refuses a bankrupt player and `selectCanEndTurn` wants
`TurnComplete`. A dead game with three solvent players in it. The fix clears `doublesCount`
rather than `canRollAgain`, because `resumeTurnAfterDecision` recomputes the flag from the count.
See `gameEngine.test.ts`, "takes the extra roll away from a player who goes out on a double".

## Known gaps

- **Online bots.** Needs a rule for which device drives them. The honest version is probably
  server-side, which this design does not have and deliberately avoids.
- **One competence level.** No easy/hard. `bot.constants.ts` is where a difficulty would live,
  and adding one means a field on `PlayerState` and a version bump — which is why it was not
  done speculatively.
- **It does not trade, and does not initiate one.** See above; accepting badly is worse than
  never accepting.
- **It does not redeem mortgages** or reason about when to stop building. Both are opinions
  about the board rather than rules, and both are cheap to add in `botCashRaising.utils.ts`.
