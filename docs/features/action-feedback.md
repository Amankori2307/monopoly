# Action feedback

**Status:** Shipped
**Entry points:** [src/features/game/toastFeed.utils.ts](../../src/features/game/toastFeed.utils.ts), [src/components/game/overlays/ToastStack.tsx](../../src/components/game/overlays/ToastStack.tsx), [src/components/game/panels/decisions/CardDrawDecision.tsx](../../src/components/game/panels/decisions/CardDrawDecision.tsx)

## What it does

Every action now says what it did. Money in or out raises a toast; a drawn Chance or Community
Chest card is shown as a card, and applies only once the player has read it and clicked OK.

Before this, the game was close to silent. Of the twelve places cash changed hands, **seven logged
nothing at all** — tax, both jail fines, and every card cash effect. Cards were drawn and applied
in one indivisible step, so the player learned what happened from a log line after the fact.

## How it works

### Toasts come from the game record, not a second channel

The engine already writes a player-facing sentence into `history` for everything it logs, so a
toast **is** a history entry:

```
runGameCommand                                          gameSlice
  └─ executeGameCommand(...)                            gameEngine (pure)
  └─ selectNewEvents(previous.history, next.history)     toastFeed.utils
  └─ toToasts(...) → dispatch(pushToasts(...))           uiSlice
  └─ <ToastStack />                                     overlays
```

Two consequences worth keeping: feedback can never drift from the activity log, because they are
the same text; and no engine or persistence change was needed to introduce it.

`classifyEventTone` derives credit / debit / neutral from the wording, since `GameEvent` carries no
severity. `"paid"` is matched before `"collected"` on purpose — a rent sentence names both players,
and reading it as a credit would colour the payer's toast the wrong way.

### Money now has two choke points

`resolveBankPayment` (out) and the new `creditFromBank` (in) are where cash moves and where the
event is written. Before, callers logged inconsistently or not at all: a card's `Collect` bumped
cash directly, and pass-GO wrote its own sentence with the amount and symbol hardcoded.

### A drawn card is a decision, not a side effect

`resolveCard` was split into `drawCard` and `applyCardEffect`:

| Step  | Command                               | Does                                                                                                  |
| ----- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Draw  | `rollTurnDice` → `drawCard`           | pops the card, recycles the deck, logs the draw, sets `pendingDecision: card-draw`. **Nothing else.** |
| Apply | `acknowledgeCard` → `applyCardEffect` | runs the effect, then settles the phase                                                               |

## Key decisions

- **The drawn card rides inside `pendingDecision`, not in a field of its own on `GameState`.**
  `schema.ts` validates `pendingDecision` with `.passthrough()`, so the card survives a save/load
  round trip. A new top-level `GameState` field would be **silently stripped** by the surrounding
  `z.object`, which drops unknown keys — a bug that would only appear after a refresh, leaving the
  player looking at a modal with no card in it. Because the shape rides along, `GAME_STATE_VERSION`
  stays at 1: no old save can carry a `card-draw`, and every variant an old save can carry is still
  handled. A `.refine` guards the one payload the game stalls without.

- **The decision is cleared before the effect is applied.** A `MoveTo` card routes back through
  `resolveCurrentSpace`, which treats any pending decision as blocking — it would read the stale
  `card-draw` and strand the turn.

- **Toasts are a polite live region, not an alert.** They report what happened and must not
  interrupt a screen reader. Anything the player has to answer is a decision modal instead.

- **The stack sits in the sidebar's flow, directly above the turn controls — it does not float.**
  Two attempts at floating it both covered something, because this screen has no free corner:
  bottom-right is the dice and the end-turn button (a toast there literally swallowed the click that
  rolled), and bottom-left is the board's own edge and the deed card. In the sidebar it occupies
  space nothing else wants. Two details make it work: the `margin-top: auto` that bottom-pins the
  pair lives on the toast stack now rather than on `.turn-controls`, and the stack is **not**
  `display: none` when empty — that would drop the auto margin and unpin the dice in the common
  case. It keeps `position: relative; z-index: 45` so it still paints above the decision backdrop
  (40), because a toast usually reports what the modal on screen just caused.

- **Toasts are never persisted.** They live in `uiSlice`, the documented home for ephemeral UI
  state, and a reload starts clean.

- **The delta comes from diffing `history`, never from `GameCommandResult.events`** — that returns
  the entire capped history rather than what changed (CLAUDE.md section 8). `selectNewEvents` falls
  back to unseen ids once the 120-event cap is reached, since length alone stops growing there and
  feedback would silently stop late in a long game.

## State and data

- `uiSlice.toasts: Toast[]` — ephemeral, capped at `MAX_VISIBLE_TOASTS` (3, since the stack now
  reserves sidebar space), not persisted.
- `GameState.pendingDecision` gains the `card-draw` variant, carrying `{ playerId, deck, card }`.
  Persisted, via `.passthrough()`. No version bump — see Key decisions.
- `GameState.history` gains events for tax, both jail fines, and every card cash effect.

## Tests

| Level       | File                                                                                              | Covers                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | [toastFeed.utils.test.ts](../../src/features/game/toastFeed.utils.test.ts)                        | tone classification, the history delta, the cap fallback, reading order                                                                                           |
| Unit        | [gameEngine.test.ts](../../src/domain/rules/gameEngine.test.ts)                                   | draw holds without applying, acknowledge applies once, jail keeps no extra roll, doubles do, throw branch, money events                                           |
| Unit        | [CardDrawDecision.test.tsx](../../src/components/game/panels/decisions/CardDrawDecision.test.tsx) | card copy, who drew it, one control only                                                                                                                          |
| Integration | [persistence.integration.test.ts](../../src/features/persistence/persistence.integration.test.ts) | the drawn card survives save → load, and a card-draw missing its card is rejected                                                                                 |
| E2E         | [feedback.spec.ts](../../tests/e2e/feedback.spec.ts)                                              | toast appears and dismisses, never intercepts a click on the dice or end-turn (hit-tested), card is readable and applies only on OK across a reload, ₹ throughout |

## Known gaps

- **`AssetLiquidation` resolves, and several debts from one card all stand.** The panel lists the
  buildings you could sell and the sites you could mortgage, says how many debts are waiting behind
  this one, and offers bankruptcy when nothing is left.
- Toasts now come from `GameCommandResult.events` rather than from diffing the history: the engine
  says what it appended.
- Toast tone comes with the event: the engine sets it at the three money choke points, so
  rephrasing a message can no longer change its colour.
- `CardEffectKind.PayEach` is implemented in the engine but no card uses it.
- `resolveCard`'s `CollectFromEach` / `PayEach` loops read `nextState`, and a debt nobody can cover
  queues behind the first rather than overwriting it.

## The tone became a cue

The event's classification was `GameEventTone` with three members, read only by this feature for the
toast's colour. Sound needs ten distinctions, so the field widened into `GameEventCue` and the toast
now narrows it: ten cues down to three colours, in one map in `toastFeed.utils.ts`. The decision
behind it is unchanged and is the important part - it is set by the engine where the thing happened,
never parsed back out of the sentence. See [sound.md](sound.md).
