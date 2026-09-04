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
  └─ toToasts(result.events)                             toastFeed.utils
  └─ dispatch(queueFeedback(...))                        uiSlice   ← queued, not shown
  ...the token walks...
  └─ useFeedbackGate(isMoving) → releaseFeedback()       features/game/hooks
  └─ <ToastStack />                                     overlays
```

Two consequences worth keeping: feedback can never drift from the activity log, because they are
the same text; and no engine or persistence change was needed to introduce it.

`classifyEventTone` narrows the event's own `GameEventCue` to credit / debit / neutral. It is one
map, and the cue is set by the engine where the thing happened — see [sound.md](sound.md).

### Feedback waits for the move it is about

The engine resolves a whole turn in one synchronous step — roll, move, rent, card, bankruptcy — and
the board then takes up to a couple of seconds to walk the token there. Showing the toasts as soon
as the command returned therefore announced the outcome **before the move that caused it**: "paid
₹250 rent" was on screen while the token was still three spaces short of the site.

So the screen replays what the engine decided, in the order it happened:

| Player sees        | Comes from                                                  |
| ------------------ | ----------------------------------------------------------- |
| the dice tumble    | `useDiceRoller`, which commits the command after the tumble |
| the token walk     | `useAnimatedTokenPositions`                                 |
| the toasts + sound | `useFeedbackGate`, once `isMoving` clears                   |
| the decision modal | `GameOverlayLayer`, on the same `isMoving`                  |

`runGameCommand` puts everything a command said into `uiSlice.pendingFeedback` and has no say in
the timing — only the screen knows whether a token is still walking. `useFeedbackGate` drains the
queue the moment `isMoving` goes false, which for a command that moves nobody (buying, mortgaging,
building) is the very next effect, so those stay immediate.

Liveness is already guaranteed elsewhere: `isMoving` is derived from the drawn positions, and
`useAnimatedTokenPositions` has a watchdog that snaps every token to its engine position. A broken
walk therefore still clears the flag and still drains the queue.

`data-moving` on `.game-layout` publishes the walk, because the invariant — _no toast on screen
while a token moves_ — is a window of a second or two, and a test that checked either side of it
would step straight over the bug.

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

- **While a decision is up, a toast is display-only.** Painting above the backdrop is what made the
  toast _readable_ over a modal; it also made it clickable over one, and a decision panel is wide
  enough to reach under the sidebar the stack sits in — so a toast intercepted the click on the very
  decision it was reporting. The backdrop's own z-index makes a stacking context, so the modal
  inside it cannot simply be raised back above the toasts. `pointer-events: none` on the toast under
  `.page:has(.decision-backdrop)` is the fix: the decision modal is deliberately the only thing the
  player may act on while it is up, and a toast dismisses itself anyway. Latent before, common
  after: the toast and the modal now arrive in the same frame, so they overlap for the toast's whole
  4.2s rather than the tail of it.

- **The toasts are clickable; the box around them is not.** `.toast-stack` is 380px wide and paints
  above the backdrop, so as a click target it covered the decision panel even in the gaps between
  toasts. It is `pointer-events: none` now and `.toast` opts back in — which is what the `.toast`
  rule was always for. Both halves are needed: switching off only the stack left every toast still
  catching clicks, and switching off only the toasts left the box between them still catching them.
  This is also what made the deadlock spec slow — every click was retried against an intercepting
  toast until it timed out — so the e2e suite runs in about half the time.

- **Toasts are never persisted.** They live in `uiSlice`, the documented home for ephemeral UI
  state, and a reload starts clean.

- **The delta is `GameCommandResult.events`, which is now exactly what the command appended.** It
  used to return the whole capped history, so the feed diffed `history` itself with a fallback on
  unseen ids for once the 120-event cap was reached. The engine says what it appended now, and the
  diff is gone.

- **The thunk queues the feedback; the screen decides when to show it.** `runGameCommand` cannot
  know whether a token is mid-walk — `isMoving` is derived from the drawn positions in a component
  hook — and pushing the isMoving check into the thunk would put a rendering concern in the
  orchestration layer. `useFeedbackGate` is the one place the timing lives, alongside the
  `isMoving` that already withholds the decision modal.

- **Toasts and the cue sound release together.** They come off the same `result.events` batch
  precisely so a sound and its toast are always the same event; gating one without the other would
  split them, and the sound would still arrive early.

## State and data

- `uiSlice.toasts: Toast[]` — what is on screen. Ephemeral, capped at `MAX_VISIBLE_TOASTS` (3,
  since the stack now reserves sidebar space), not persisted.
- `uiSlice.pendingFeedback: PendingFeedback` — the toasts and the one cue a command produced, still
  waiting on the walk. Toasts **append**, so a property command taken mid-walk cannot push the
  walker's own feedback out; the cue has one slot and the newest wins, since there is only one
  channel to play it on. Muting clears the queued cue as well as the live one.
- `GameState.pendingDecision` gains the `card-draw` variant, carrying `{ playerId, deck, card }`.
  Persisted, via `.passthrough()`. No version bump — see Key decisions.
- `GameState.history` gains events for tax, both jail fines, and every card cash effect.

## Tests

| Level       | File                                                                                              | Covers                                                                                                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | [toastFeed.utils.test.ts](../../src/features/game/toastFeed.utils.test.ts)                        | tone classification, the history delta, the cap fallback, reading order                                                                                                                                                                                                                                    |
| Unit        | [uiSlice.test.ts](../../src/features/game/uiSlice.test.ts)                                        | queued is not shown, release puts toast and cue up together, append across commands, newest cue wins, a mute drops the queued cue                                                                                                                                                                          |
| Unit        | [useFeedbackGate.test.tsx](../../src/features/game/hooks/useFeedbackGate.test.tsx)                | held while moving, released on arrival, immediate when nothing moves, a whole turn in one go, oldest first                                                                                                                                                                                                 |
| Integration | [gameSlice.integration.test.ts](../../src/features/game/gameSlice.integration.test.ts)            | the thunk queues and shows nothing, and the queue reaches the screen on release                                                                                                                                                                                                                            |
| Integration | [GamePage.integration.test.tsx](../../src/features/game/GamePage.integration.test.tsx)            | the toast waits for the walk, and no toast is ever on screen while `data-moving` is true                                                                                                                                                                                                                   |
| Unit        | [gameEngine.test.ts](../../src/domain/rules/gameEngine.test.ts)                                   | draw holds without applying, acknowledge applies once, jail keeps no extra roll, doubles do, throw branch, money events                                                                                                                                                                                    |
| Unit        | [CardDrawDecision.test.tsx](../../src/components/game/panels/decisions/CardDrawDecision.test.tsx) | card copy, who drew it, one control only                                                                                                                                                                                                                                                                   |
| Integration | [persistence.integration.test.ts](../../src/features/persistence/persistence.integration.test.ts) | the drawn card survives save → load, and a card-draw missing its card is rejected                                                                                                                                                                                                                          |
| E2E         | [feedback.spec.ts](../../tests/e2e/feedback.spec.ts)                                              | toast appears and dismisses, never intercepts a click on the dice or end-turn (hit-tested), never announces the outcome mid-walk, never intercepts a click on the decision panel (both sampled every 16ms across a played-out game), card is readable and applies only on OK across a reload, ₹ throughout |

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
